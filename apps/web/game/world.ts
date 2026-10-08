import * as Phaser from "phaser";
import {
  contains,
  socket,
  type PlayerSnapshot,
  type Point,
  type GameCommand,
  type CommandResult,
  type Rect,
} from "@site/sim-core";
import {
  buildCommand,
  hitTest,
  DEFAULT_MODE,
  structureKey as computeStructureKey,
  type WorldMode,
  type Tool,
} from "./interaction";
import { t as translate } from "./i18n";
import { machineStatusLabel } from "./machine-status";
import { observationKey, unseenObservations } from "./observations";
import { factoryContractPresentation } from "./factory-presentation";
import { beltPresentations } from "./belt-presentation";
import {
  ART_CAMERA,
  artAsset,
  preloadRepresentativeArt,
  representativeMachineAsset,
  type ArtAssetId,
} from "./art-assets";
import { deriveFeedbackEvents, type FeedbackEvent } from "./feedback";
import { IndustrialFeedbackAudio } from "./audio-feedback";
import { CameraNavigation, type CameraView } from "./camera-navigation";
import {
  DEFAULT_GAME_PREFERENCES,
  type GamePreferences,
} from "./preferences";
import {
  finishBrowserMetric,
  recordBrowserMetric,
  startBrowserMetric,
} from "./performance";
export type WorldControls = {
  setSnapshot(s: PlayerSnapshot): void;
  setMode(mode: WorldMode): void;
  setPreferences(preferences: GamePreferences): void;
  getCameraView(): (CameraView & { target: CameraView }) | null;
  projectWorldPoint(worldX: number, worldY: number): { x: number; y: number } | null;
  home(): void;
  destroy(): void;
};
export type WorldActions = {
  select(id: string | null): void;
  command(c: GameCommand): CommandResult;
  preview(c: GameCommand): CommandResult;
  mode(tool: Tool): void;
  rotate(): void;
  toggleFactory(id: string): void;
};
const X = ART_CAMERA.cellWidth,
  Y = ART_CAMERA.cellHeight;
const color = (value: string) => parseInt(value.slice(1), 16);
const editing = () => {
  const el = document.activeElement;
  return (
    el instanceof HTMLElement &&
    (el.matches("input,textarea,select") || el.isContentEditable)
  );
};
export function createWorld(
  parent: HTMLElement,
  initial: PlayerSnapshot,
  actions: WorldActions,
  initialMode: WorldMode = DEFAULT_MODE,
  initialPreferences: GamePreferences = DEFAULT_GAME_PREFERENCES,
): WorldControls {
  const feedbackAudio = new IndustrialFeedbackAudio();
  let snapshot = initial,
    mode = initialMode,
    preferences = initialPreferences,
    scene: Site | undefined,
    structureKey = "",
    destroyed = false;
  class Site extends Phaser.Scene {
    private grid!: Phaser.GameObjects.Graphics;
    private structures!: Phaser.GameObjects.Container;
    private dynamic!: Phaser.GameObjects.Graphics;
    private ghost!: Phaser.GameObjects.Graphics;
    private labels = new Map<string, Phaser.GameObjects.Text>();
    private tooltip!: Phaser.GameObjects.Text;
    private hover: Point | null = null;
    private anchor: Point | null = null;
    private keys = new Set<string>();
    private navigation!: CameraNavigation;
    private viewportWidth = 0;
    private viewportHeight = 0;
    private readonly reducedMotionQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    private dirty = true;
    private seenDiscoveries = new Set(initial.observations.map(observationKey));
    private notices: Phaser.GameObjects.Text[] = [];
    preload() {
      preloadRepresentativeArt(this.load);
    }
    private artImage(
      id: ArtAssetId,
      x: number,
      y: number,
      width: number,
      height: number,
      rotation = 0,
      alpha = 1,
    ) {
      const asset = artAsset(id);
      const image = this.add
        .image(x, y, asset.textureKey)
        .setOrigin(asset.anchor.x, asset.anchor.y)
        .setDisplaySize(width, height)
        .setRotation(rotation)
        .setAlpha(alpha);
      this.structures.add(image);
      return image;
    }
    private text(x: number, y: number, t: string, size = 10, c = "#c4c7b0") {
      return this.add
        .text(x, y, t, {
          fontFamily: "Consolas,monospace",
          fontSize: size,
          color: c,
          stroke: "#22271f",
          strokeThickness: 2,
        })
        .setOrigin(0.5);
    }
    private box(
      g: Phaser.GameObjects.Graphics,
      r: Rect,
      top: number,
      front: number,
      h = 12,
    ) {
      const x = r.x * X,
        y = r.y * Y,
        w = r.width * X,
        depth = r.height * Y;
      g.fillStyle(0x111812, 0.35).fillRect(x + 8, y + 8, w + 6, depth + 5);
      g.fillStyle(front).fillRect(x, y - h, w, depth + h);
      g.fillStyle(top).fillRect(x, y - h, w, depth);
      g.lineStyle(1, 0xd8d9b2, 0.16).strokeRect(
        x + 0.5,
        y - h + 0.5,
        w - 1,
        depth - 1,
      );
      g.lineStyle(1, 0x111a12, 0.7).lineBetween(x, y + depth, x + w, y + depth);
    }
    create() {
      // The bridge retains the scene for coarse snapshot and camera updates.
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      scene = this;
      this.cameras.main.setBackgroundColor("#343d30");
      const ground = this.add.graphics();
      ground
        .fillStyle(0x3a4233)
        .fillRect(0, 0, snapshot.map.width * X, snapshot.map.height * Y);
      const terrain = artAsset("terrain-basalt");
      this.add
        .tileSprite(
          0,
          0,
          snapshot.map.width * X,
          snapshot.map.height * Y,
          terrain.textureKey,
        )
        .setOrigin(0)
        .setAlpha(0.14);
      let seed = 131;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let i = 0; i < 1700; i++) {
        const x = rand() * snapshot.map.width * X,
          y = rand() * snapshot.map.height * Y,
          r = 1 + rand() * 5;
        ground
          .fillStyle(i % 3 ? 0x252e25 : 0x72705a, 0.35)
          .fillEllipse(x, y, r * 2, r);
      }
      for (const d of snapshot.deposits) {
        const mat = snapshot.materials.find((m) => m.id === d.material)!;
        ground
          .fillStyle(color(mat.color), 0.12)
          .fillRoundedRect(
            d.x * X - 10,
            d.y * Y - 10,
            d.width * X + 20,
            d.height * Y + 20,
            30,
          );
        for (let i = 0; i < d.width * d.height * 3; i++) {
          const x = (d.x + rand() * d.width) * X,
            y = (d.y + rand() * d.height) * Y,
            w = 5 + rand() * 11;
          ground.fillStyle(0x1d241c, 0.5).fillEllipse(x + 4, y + 5, w * 2, w);
          ground
            .fillStyle(color(mat.color), 0.5 + rand() * 0.4)
            .fillTriangle(x - w, y + 3, x - w / 3, y - w / 2, x + w, y + 2);
          ground
            .lineStyle(1, 0xe0c590, 0.45)
            .lineBetween(x - w / 3, y - w / 2, x + w, y + 2);
        }
        if (d.material === "ferrite") {
          const asset = artAsset("deposit-ferrite");
          this.add
            .image(
              (d.x + d.width / 2) * X,
              (d.y + d.height * 0.75) * Y,
              asset.textureKey,
            )
            .setOrigin(asset.anchor.x, asset.anchor.y)
            .setDisplaySize(d.width * X + 28, d.height * Y + 22)
            .setAlpha(0.72);
        }
        this.text(
          (d.x + d.width / 2) * X,
          (d.y + d.height) * Y + 17,
          translate(mat.nameKey).toUpperCase(),
          9,
          "#b6b397",
        );
      }
      const t = snapshot.map.terminal;
      ground
        .fillStyle(0x85836b, 0.15)
        .fillRoundedRect(
          t.x * X - 20,
          t.y * Y - 20,
          t.width * X + 40,
          t.height * Y + 40,
          10,
        );
      this.grid = this.add.graphics().setVisible(false);
      this.grid.lineStyle(1, 0xc5c4a2, 0.12);
      for (let x = 0; x <= snapshot.map.width; x++)
        this.grid.lineBetween(x * X, 0, x * X, snapshot.map.height * Y);
      for (let y = 0; y <= snapshot.map.height; y++)
        this.grid.lineBetween(0, y * Y, snapshot.map.width * X, y * Y);
      this.structures = this.add.container(0, 0);
      this.dynamic = this.add.graphics();
      this.ghost = this.add.graphics();
      this.tooltip = this.add
        .text(0, 0, "", {
          fontFamily: "Consolas,monospace",
          fontSize: 11,
          color: "#e2dfc3",
          backgroundColor: "#172018ed",
          padding: { x: 9, y: 6 },
        })
        .setDepth(1000);
      this.navigation = new CameraNavigation(
        {
          worldWidth: snapshot.map.width * X,
          worldHeight: snapshot.map.height * Y,
          viewportWidth: this.cameras.main.width,
          viewportHeight: this.cameras.main.height,
        },
        { zoom: 1, scrollX: 0, scrollY: 0 },
        { motion: "instant" },
      );
      this.viewportWidth = this.cameras.main.width;
      this.viewportHeight = this.cameras.main.height;
      this.home(true);
      this.setCameraPreferences(preferences);
      const mediaChanged = () => this.setCameraPreferences(preferences);
      this.reducedMotionQuery?.addEventListener("change", mediaChanged);
      this.events.once("shutdown", () =>
        this.reducedMotionQuery?.removeEventListener("change", mediaChanged),
      );
      this.input.mouse?.disableContextMenu();
      this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
        if (p.isDown && (p.rightButtonDown() || p.middleButtonDown())) {
          this.navigation.panByScreen(
            p.x - p.prevPosition.x,
            p.y - p.prevPosition.y,
          );
        }
        this.hover = this.cell(p);
      });
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
        void feedbackAudio.enable();
        if (!p.leftButtonDown()) return;
        this.hover = this.cell(p);
        this.anchor = this.hover;
      });
      this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
        if (p.button !== 0 || !this.anchor) return;
        const cell = this.cell(p);
        if (mode.tool === "select") {
          const id = hitTest(snapshot, cell, mode.openFactories);
          actions.select(id);
        } else {
          const command = buildCommand(mode, snapshot, cell, this.anchor);
          if (command) actions.command(command);
        }
        this.anchor = null;
      });
      this.input.on("gameout", () => {
        this.hover = null;
      });
      this.input.on("pointerupoutside", () => {
        this.anchor = null;
      });
      this.input.on(
        "wheel",
        (
          p: Phaser.Input.Pointer,
          _objects: unknown,
          _dx: number,
          dy: number,
          _dz: number,
          event: WheelEvent,
        ) => {
          event?.preventDefault();
          const direction = preferences.controls.invertWheelZoom ? 1 : -1;
          const delta = Phaser.Math.Clamp(dy, -240, 240);
          const factor = Math.exp(
            direction * delta * 0.0009 * preferences.camera.zoomSensitivity,
          );
          this.navigation.zoomAt(factor, p.x, p.y);
        },
      );
      const down = (e: KeyboardEvent) => {
        if (editing()) return;
        void feedbackAudio.enable();
        const k = e.key.toLowerCase();
        this.keys.add(k);
        if (
          ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)
        )
          e.preventDefault();
        if (e.repeat) return;
        if (k === "r") actions.rotate();
        if (k === "escape") {
          this.anchor = null;
          actions.mode("select");
          actions.select(null);
        }
        if (k === "home") {
          e.preventDefault();
          this.home();
        }
        if (
          k === "f" &&
          mode.selected &&
          snapshot.factories.some((f) => f.id === mode.selected)
        )
          actions.toggleFactory(mode.selected);
      };
      const up = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
      const blur = () => {
        this.keys.clear();
        this.anchor = null;
      };
      window.addEventListener("keydown", down);
      window.addEventListener("keyup", up);
      window.addEventListener("blur", blur);
      this.events.once("shutdown", () => {
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
        window.removeEventListener("blur", blur);
      });
      this.rebuild();
      this.refresh();
    }
    cell(p: Phaser.Input.Pointer): Point {
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      return { x: Math.floor(w.x / X), y: Math.floor(w.y / Y) };
    }
    buildUnit() {
      const key = snapshot.materials.find(
        (m) => m.id === snapshot.map.buildMaterial,
      )?.nameKey;
      return key ? translate(key).toLowerCase() : snapshot.map.buildMaterial;
    }
    private cameraInstant(): boolean {
      const reduced = preferences.accessibility.reducedMotion;
      const prefersReduced = reduced === "on" ||
        (reduced === "system" && this.reducedMotionQuery?.matches === true);
      return !preferences.camera.smooth || prefersReduced;
    }
    setCameraPreferences(next: GamePreferences) {
      preferences = next;
      if (!this.navigation) return;
      this.navigation.setHalfLifeMs(45 + next.camera.inertia * 205);
      this.navigation.setMotion(this.cameraInstant() ? "instant" : "smooth");
    }
    home(initial = false) {
      const camera = this.cameras.main;
      const zoom = Math.min(
        camera.width / (36 * X),
        camera.height / (27 * Y),
      );
      this.navigation.centerOn(29 * X, 30 * Y, zoom);
      if (initial) this.navigation.reset(this.navigation.getTarget());
      this.applyCamera(this.navigation.getView());
    }
    getCameraView(): (CameraView & { target: CameraView }) | null {
      return this.navigation
        ? { ...this.navigation.getView(), target: this.navigation.getTarget() }
        : null;
    }
    projectWorldPoint(worldX: number, worldY: number) {
      const camera = this.cameras.main;
      const origin = camera.getWorldPoint(0, 0);
      const corner = camera.getWorldPoint(camera.width, camera.height);
      const width = corner.x - origin.x;
      const height = corner.y - origin.y;
      if (Math.abs(width) < 0.0001 || Math.abs(height) < 0.0001) return null;
      // Return ratios relative to the canvas; browser viewport/DPR are
      // applied by the test at the DOM boundary.
      return {
        x: (worldX - origin.x) / width,
        y: (worldY - origin.y) / height,
      };
    }
    private applyCamera(view: CameraView) {
      this.cameras.main.setZoom(view.zoom);
      this.cameras.main.setScroll(view.scrollX, view.scrollY);
    }
    markDirty() {
      this.dirty = true;
    }
    feedback(events: readonly FeedbackEvent[]) {
      if (!events.length) return;
      feedbackAudio.play(events);
      const visual = {
        "machine-start": { tint: 0xa9cf8a, radius: 14, duration: 480 },
        "logistics-flow": { tint: 0xb9c7a0, radius: 10, duration: 360 },
        discovery: { tint: 0xd8d79a, radius: 22, duration: 850 },
        warning: { tint: 0xe5ad75, radius: 18, duration: 700 },
        hazard: { tint: 0xe57865, radius: 24, duration: 900 },
      } as const;
      for (const event of events) {
        if (!event.at) continue;
        const cue = visual[event.kind],
          x = event.at.x * X,
          y = event.at.y * Y,
          pulse = this.add.graphics().setDepth(940);
        pulse
          .lineStyle(event.kind === "hazard" ? 4 : 2, cue.tint, 0.95)
          .strokeCircle(x, y, cue.radius);
        if (event.kind === "warning" || event.kind === "hazard")
          pulse
            .lineStyle(1, cue.tint, 0.65)
            .strokeCircle(x, y, Math.max(5, cue.radius - 7));
        this.tweens.add({
          targets: pulse,
          scaleX: event.kind === "discovery" ? 2.4 : 1.9,
          scaleY: event.kind === "discovery" ? 2.4 : 1.9,
          alpha: 0,
          duration: cue.duration,
          ease: "Quad.easeOut",
          onComplete: () => pulse.destroy(),
        });
      }
    }
    arrow(
      g: Phaser.GameObjects.Graphics,
      x: number,
      y: number,
      d: number,
      c: number,
      size = 5,
    ) {
      const v = [
          { x: 1, y: 0 },
          { x: 0, y: 1 },
          { x: -1, y: 0 },
          { x: 0, y: -1 },
        ][d],
        a = { x: x + v.x * size, y: y + v.y * size },
        b = {
          x: x - v.x * size - v.y * size * 0.7,
          y: y - v.y * size + v.x * size * 0.7,
        },
        e = {
          x: x - v.x * size + v.y * size * 0.7,
          y: y - v.y * size - v.x * size * 0.7,
        };
      g.fillStyle(c).fillTriangle(a.x, a.y, b.x, b.y, e.x, e.y);
    }
    rebuild() {
      if (!this.structures) return;
      this.structures.removeAll(true);
      this.labels.clear();
      const g = this.add.graphics();
      this.structures.add(g);
      for (const f of snapshot.factories) {
        g.fillStyle(0x222c24).fillRect(
          f.x * X,
          f.y * Y,
          f.width * X,
          f.height * Y,
        );
        g.lineStyle(1, 0x60715c, 0.2);
        for (let x = f.x + 1; x < f.x + f.width; x++)
          g.lineBetween(x * X, f.y * Y, x * X, (f.y + f.height) * Y);
        for (let y = f.y + 1; y < f.y + f.height; y++)
          g.lineBetween(f.x * X, y * Y, (f.x + f.width) * X, y * Y);
      }
      for (const source of snapshot.atmosphericSources) {
        const material = source.material
          ? snapshot.materials.find((entry) => entry.id === source.material)
          : undefined;
        const tint = color(material?.color ?? "#9fb8b0");
        g.fillStyle(tint, 0.09).fillRoundedRect(
          source.x * X,
          source.y * Y,
          source.width * X,
          source.height * Y,
          18,
        );
        g.lineStyle(2, tint, 0.55).strokeRoundedRect(
          source.x * X + 2,
          source.y * Y + 2,
          source.width * X - 4,
          source.height * Y - 4,
          18,
        );
        this.structures.add(
          this.text(
            (source.x + source.width / 2) * X,
            source.y * Y - 11,
            translate(source.nameKey).toUpperCase(),
            9,
            "#bfd0c7",
          ),
        );
      }
      const drawUnderground = (
        entry: Point,
        exit: Point,
        direction: number,
        tint: number,
      ) => {
        const sx = (entry.x + 0.5) * X,
          sy = (entry.y + 0.5) * Y,
          ex = (exit.x + 0.5) * X,
          ey = (exit.y + 0.5) * Y,
          span = Math.abs(exit.x - entry.x) + Math.abs(exit.y - entry.y);
        g.lineStyle(3, tint, 0.36);
        for (let i = 0; i < span; i += 2) {
          const from = i / span,
            to = Math.min(1, (i + 1) / span);
          g.lineBetween(
            sx + (ex - sx) * from,
            sy + (ey - sy) * from,
            sx + (ex - sx) * to,
            sy + (ey - sy) * to,
          );
        }
        for (const portal of [entry, exit]) {
          const cx = (portal.x + 0.5) * X,
            cy = (portal.y + 0.5) * Y;
          g.fillStyle(0x1b241d, 0.95).fillRoundedRect(
            portal.x * X + 4,
            portal.y * Y + 3,
            X - 8,
            Y - 6,
            5,
          );
          g.lineStyle(2, tint, 0.9).strokeRoundedRect(
            portal.x * X + 4,
            portal.y * Y + 3,
            X - 8,
            Y - 6,
            5,
          );
          this.arrow(g, cx, cy, direction, tint, 4);
          this.artImage(
            "logistics-underground",
            cx,
            cy + 4,
            X,
            Y + 4,
            direction * (Math.PI / 2),
            0.86,
          );
        }
      };
      for (const route of snapshot.undergroundSolids)
        drawUnderground(route.entry, route.exit, route.direction, 0xb6ab7a);
      for (const route of snapshot.undergroundLiquids)
        drawUnderground(route.entry, route.exit, route.direction, 0x72aeb7);
      for (const route of snapshot.elevatedSolids) {
        const sx = (route.entry.x + 0.5) * X,
          sy = (route.entry.y + 0.5) * Y - 14,
          ex = (route.exit.x + 0.5) * X,
          ey = (route.exit.y + 0.5) * Y - 14,
          span =
            Math.abs(route.exit.x - route.entry.x) +
            Math.abs(route.exit.y - route.entry.y),
          dx = Math.sign(route.exit.x - route.entry.x),
          dy = Math.sign(route.exit.y - route.entry.y),
          maxSupport = snapshot.map.elevatedSolid.maxSupportSpan,
          supports = [0];
        for (let distance = maxSupport; distance < span; distance += maxSupport)
          supports.push(distance);
        if (supports.at(-1) !== span) supports.push(span);
        g.lineStyle(10, 0x39443c, 0.95).lineBetween(sx, sy, ex, ey);
        g.lineStyle(3, 0xc8bd8b, 0.95).lineBetween(sx, sy, ex, ey);
        for (const distance of supports) {
          const x = (route.entry.x + dx * distance + 0.5) * X,
            groundY = (route.entry.y + dy * distance + 0.5) * Y;
          g.lineStyle(4, 0x6e7566, 0.95).lineBetween(
            x,
            groundY + 7,
            x,
            groundY - 14,
          );
          g.fillStyle(0x535d50, 0.95).fillRect(x - 5, groundY + 3, 10, 6);
        }
        this.arrow(g, ex, ey, route.direction, 0xe1cc8f, 4);
        this.artImage(
          "logistics-elevated",
          (sx + ex) / 2,
          (sy + ey) / 2 + 17,
          Math.max(96, span * X),
          48,
          route.entry.x === route.exit.x ? Math.PI / 2 : 0,
          0.72,
        );
      }

      const beltViews = beltPresentations(snapshot);
      for (const b of snapshot.belts) {
        if (
          snapshot.factories.some(
            (f) => contains(f, b) && !mode.openFactories.includes(f.id),
          )
        )
          continue;
        const x = b.x * X,
          y = b.y * Y;
        const view = beltViews.get(b.id)!;
        const cx = x + X / 2,
          cy = y + Y / 2;
        const vectors = [
          [1, 0],
          [0, 1],
          [-1, 0],
          [0, -1],
        ];
        const arms = new Set([
          ...view.inlets,
          ...view.outlets.map((o) => o.direction),
        ]);
        // Physical track follows connected inlets and configured exits; a
        // standby branch stays visible but is dashed and gated, never active.
        for (const side of arms) {
          const [dx, dy] = vectors[side];
          const outlet = view.outlets.find((o) => o.direction === side);
          const standby =
            outlet && !outlet.active && !view.inlets.includes(side);
          const ex = cx + (dx * X) / 2,
            ey = cy + (dy * Y) / 2;
          if (standby) {
            for (const [from, to] of [
              [0.15, 0.4],
              [0.6, 0.85],
            ]) {
              g.lineStyle(6, 0x68756d, 0.65).lineBetween(
                cx + ((dx * X) / 2) * from,
                cy + ((dy * Y) / 2) * from,
                cx + ((dx * X) / 2) * to,
                cy + ((dy * Y) / 2) * to,
              );
            }
          } else {
            g.lineStyle(12, 0x727762, 0.9).lineBetween(cx, cy, ex, ey);
            g.lineStyle(8, 0x171f1a).lineBetween(cx, cy, ex, ey);
          }
        }
        g.fillStyle(0x171f1a).fillCircle(cx, cy, 4);
        if (!view.junction) {
          this.artImage(
            "logistics-belt",
            cx,
            cy,
            X,
            Y,
            (b.direction ?? 0) * (Math.PI / 2),
            0.58,
          );
        }
        if (view.junction) {
          // Inward arrows distinguish merger/splitter roles without color.
          for (const side of view.inlets) {
            const [dx, dy] = vectors[side];
            this.arrow(
              g,
              cx + dx * X * 0.3,
              cy + dy * Y * 0.3,
              (side + 2) % 4,
              0xb7c6a0,
              3,
            );
            if (side === view.preferredInlet)
              g.lineStyle(1, 0xe5d198).strokeCircle(
                cx + dx * X * 0.3,
                cy + dy * Y * 0.3,
                5,
              );
            if (view.closedInlets?.includes(side))
              g.lineStyle(3, 0xe5d198).lineBetween(
                cx + dx * X * 0.3 - dy * 5,
                cy + dy * Y * 0.3 + dx * 5,
                cx + dx * X * 0.3 + dy * 5,
                cy + dy * Y * 0.3 - dx * 5,
              );
            if (view.disconnectedInlets?.includes(side))
              g.lineStyle(2, 0xc49670).lineBetween(
                cx + dx * (X / 2 - 2) - dy * 4,
                cy + dy * (Y / 2 - 2) + dx * 4,
                cx + dx * (X / 2 - 2) + dy * 4,
                cy + dy * (Y / 2 - 2) - dx * 4,
              );
          }
          g.lineStyle(1, 0xe5d198).strokeRect(cx - 4, cy - 4, 8, 8);
        }
        for (const outlet of view.outlets) {
          const [dx, dy] = vectors[outlet.direction];
          const ax = cx + dx * X * 0.3,
            ay = cy + dy * Y * 0.3;
          if (outlet.active) {
            this.arrow(
              g,
              ax,
              ay,
              outlet.direction,
              b.alternate === null ? 0xb7c6a0 : 0xd4bd7d,
              3,
            );
          } else {
            // A transverse gate makes inactive exits readable without color.
            g.lineStyle(2, 0x9ba69a).lineBetween(
              ax - dy * 4,
              ay + dx * 4,
              ax + dy * 4,
              ay - dx * 4,
            );
          }
          if (outlet.direction === view.heldOutlet)
            g.lineStyle(2, 0xe5d198).strokeRect(ax - 4, ay - 4, 8, 8);
          if (outlet.preferred)
            g.lineStyle(1, 0xe5d198).strokeCircle(ax, ay, 5);
          if (outlet.blocked)
            g.lineStyle(2, 0xc49670).lineBetween(
              ax - dy * 4,
              ay + dx * 4,
              ax + dy * 4,
              ay - dx * 4,
            );
          if (!outlet.connected) {
            // Broken destination: leave a gap before a short end stop.
            const ex = cx + dx * (X / 2 - 2),
              ey = cy + dy * (Y / 2 - 2);
            g.lineStyle(2, 0xc49670).lineBetween(
              ex - dy * 4,
              ey + dx * 4,
              ex + dy * 4,
              ey - dx * 4,
            );
          }
        }
      }
      const t = snapshot.map.terminal;
      this.box(g, t, 0x9a9f86, 0x565f4c, 18);
      this.artImage(
        "terminal-core",
        (t.x + t.width / 2) * X,
        (t.y + t.height) * Y + 4,
        t.width * X + 20,
        t.height * Y + 46,
        0,
        0.88,
      );
      for (const d of snapshot.terminalModules) {
        const px = (t.x + d.inlet.x + 0.5) * X,
          py = (t.y + d.inlet.y + 0.5) * Y;
        const tint = !d.installed
          ? 0x66685d
          : d.contents.quantity >= d.capacity
            ? 0xd78b62
            : d.handlingState === "liquid"
              ? 0x69bac8
              : 0xdbbf7f;
        g.fillStyle(tint, 1).fillCircle(px, py, 8);
        this.arrow(g, px, py, (d.inlet.side + 2) % 4, 0xf1eed4, 5);
      }
      this.box(
        g,
        { x: t.x + 0.4, y: t.y + 0.5, width: 2.2, height: 1.8 },
        0xc0b99a,
        0x7e856c,
        23,
      );
      g.fillStyle(0x243d34).fillRect(
        (t.x + 0.7) * X,
        (t.y + 0.5) * Y - 9,
        39,
        22,
      );
      g.lineStyle(2, 0xa2d298).lineBetween(
        (t.x + 0.9) * X,
        (t.y + 0.8) * Y - 9,
        (t.x + 1.5) * X,
        (t.y + 0.6) * Y - 9,
      );
      g.lineStyle(4, 0xafb89a).lineBetween(
        (t.x + 3) * X,
        t.y * Y - 12,
        (t.x + 3) * X,
        t.y * Y - 65,
      );
      g.lineStyle(2, 0xafb89a).strokeEllipse(
        (t.x + 3) * X,
        t.y * Y - 68,
        46,
        17,
      );
      this.structures.add(
        this.text((t.x + 2) * X, (t.y + 4) * Y + 16, "COMPANY TERMINAL", 10),
      );
      for (const route of snapshot.undergroundSolids) {
        if (!route.cargo) continue;
        const span =
            Math.abs(route.exit.x - route.entry.x) +
            Math.abs(route.exit.y - route.entry.y),
          progress = 1 - route.cargo.remainingSteps / span,
          x = (route.entry.x + 0.5 + (route.exit.x - route.entry.x) * progress) * X,
          y = (route.entry.y + 0.5 + (route.exit.y - route.entry.y) * progress) * Y,
          material = snapshot.materials.find(
            (m) => m.id === route.cargo!.materialId,
          );
        g.fillStyle(color(material?.color ?? "#dad5b8")).fillRoundedRect(
          x - 5,
          y - 5,
          10,
          10,
          2,
        );
      }
      for (const route of snapshot.elevatedSolids) {
        if (!route.cargo) continue;
        const span =
            Math.abs(route.exit.x - route.entry.x) +
            Math.abs(route.exit.y - route.entry.y),
          progress = 1 - route.cargo.remainingSteps / span,
          x =
            (route.entry.x +
              0.5 +
              (route.exit.x - route.entry.x) * progress) *
            X,
          y =
            (route.entry.y +
              0.5 +
              (route.exit.y - route.entry.y) * progress) *
              Y -
            14,
          material = snapshot.materials.find(
            (m) => m.id === route.cargo!.materialId,
          );
        g.fillStyle(color(material?.color ?? "#dad5b8")).fillRoundedRect(
          x - 5,
          y - 5,
          10,
          10,
          2,
        );
      }
      for (const route of snapshot.undergroundLiquids) {
        if (!route.materialId || !route.quantity) continue;
        const span =
            Math.abs(route.exit.x - route.entry.x) +
            Math.abs(route.exit.y - route.entry.y),
          progress = 1 - route.remainingSteps / span,
          x = (route.entry.x + 0.5 + (route.exit.x - route.entry.x) * progress) * X,
          y = (route.entry.y + 0.5 + (route.exit.y - route.entry.y) * progress) * Y,
          material = snapshot.materials.find((m) => m.id === route.materialId);
        g.fillStyle(color(material?.color ?? "#69bac8")).fillCircle(x, y, 5);
      }
      for (const m of snapshot.machines) {
        if (m.factoryId && !mode.openFactories.includes(m.factoryId)) continue;
        this.box(
          g,
          m,
          m.role === "extractor"
            ? 0x87937a
            : m.definitionId === "crusher"
              ? 0x9ca582
              : 0xaba084,
          0x56634d,
          10,
        );
        const x = (m.x + m.width / 2) * X,
          y = (m.y + m.height / 2) * Y,
          representativeArt = representativeMachineAsset(m.definitionId);
        if (representativeArt)
          this.artImage(
            representativeArt,
            x,
            (m.y + m.height) * Y + 3,
            m.width * X + 26,
            m.height * Y + 38,
            m.direction * (Math.PI / 2),
            0.88,
          );
        if (m.definitionId === "atmospheric-intake") {
          g.lineStyle(5, 0x66786f).strokeCircle(x, y - 24, 17);
          for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i;
            g.lineStyle(4, 0xb8c8bd).lineBetween(
              x,
              y - 24,
              x + Math.cos(angle) * 14,
              y - 24 + Math.sin(angle) * 14,
            );
          }
          g.lineStyle(5, 0x59695e).lineBetween(x, y - 7, x, y + 7);
        } else if (m.role === "extractor") {
          g.lineStyle(6, 0x485642).lineBetween(x - 16, y - 5, x - 16, y - 47);
          g.lineStyle(5, 0xb7b28a).lineBetween(x - 16, y - 47, x + 14, y - 47);
          g.lineStyle(4, 0xc3b379).lineBetween(x + 14, y - 47, x + 14, y + 3);
          for (let i = 0; i < 4; i++)
            g.lineStyle(2, 0x5b664c).lineBetween(
              x + 8,
              y - 37 + i * 9,
              x + 20,
              y - 32 + i * 9,
            );
        } else if (m.definitionId === "crusher") {
          g.fillStyle(0x263025).fillEllipse(x, y - 15, 38, 23);
          g.lineStyle(4, 0xc1c6a1).strokeEllipse(x, y - 15, 38, 23);
          g.fillStyle(0x354330).fillRect(x - 15, y + 6, 30, 8);
        } else {
          g.fillStyle(0x302e25).fillRect(x - 16, y - 19, 28, 25);
          g.fillStyle(0xd79950).fillRect(x - 11, y - 13, 18, 12);
          g.fillStyle(0x687358).fillRect(x + 19, y - 46, 11, 37);
        }
        if (m.incident)
          this.artImage(
            "effect-scorch",
            x,
            (m.y + m.height / 2) * Y,
            m.width * X + 12,
            m.height * Y + 6,
            0,
            0.78,
          );
        const def = snapshot.definitions.find((d) => d.id === m.definitionId)!;
        const output = socket(m, def, true),
          input = socket(m, def, false);
        this.arrow(
          g,
          (output.x + 0.5) * X,
          (output.y + 0.5) * Y,
          m.direction,
          0xd4bd7d,
          5,
        );
        if (m.role === "processor")
          this.arrow(
            g,
            (input.x + 0.5) * X,
            (input.y + 0.5) * Y,
            m.direction,
            0x9bd0c4,
            5,
          );
        const label = this.text(x, (m.y + m.height) * Y + 12, "", 9);
        this.labels.set(m.id, label);
        this.structures.add(label);
      }
      for (const t of snapshot.storages) {
        const def = snapshot.storageDefinitions.find(
          (d) => d.id === t.definitionId,
        )!;
        this.box(g, t, 0x7d8a6f, 0x44513f, 10);
        const x = (t.x + t.width / 2) * X,
          y = (t.y + t.height / 2) * Y,
          w = t.width * X;
        g.lineStyle(2, 0x354933).strokeRect(x - w / 2 + 6, y - 10, w - 12, 20);
        g.lineStyle(1, 0x354933, 0.6);
        for (let i = 1; i < 3; i++)
          g.lineBetween(
            x - w / 2 + 6,
            y - 10 + i * 7,
            x + w / 2 - 6,
            y - 10 + i * 7,
          );
        const output = socket(t, def, true),
          input = socket(t, def, false);
        this.arrow(
          g,
          (output.x + 0.5) * X,
          (output.y + 0.5) * Y,
          t.direction,
          0xd4bd7d,
          5,
        );
        this.arrow(
          g,
          (input.x + 0.5) * X,
          (input.y + 0.5) * Y,
          t.direction,
          0x9bd0c4,
          5,
        );
        const label = this.text(x, (t.y + t.height) * Y + 12, "", 9);
        this.labels.set(t.id, label);
        this.structures.add(label);
      }

      const hiddenLiquid = (p: Point) =>
        snapshot.factories.some(
          (f) => contains(f, p) && !mode.openFactories.includes(f.id),
        );
      for (const p of snapshot.pressureLines) {
        if (hiddenLiquid(p)) continue;
        const cx = (p.x + 0.5) * X,
          cy = (p.y + 0.5) * Y,
          vectors = [
            [1, 0],
            [0, 1],
            [-1, 0],
            [0, -1],
          ];
        for (const side of [p.inlet, p.outlet]) {
          const [dx, dy] = vectors[side];
          g.lineStyle(10, 0xbda875).lineBetween(
            cx,
            cy,
            cx + (dx * X) / 2,
            cy + (dy * Y) / 2,
          );
          g.lineStyle(5, 0x453923).lineBetween(
            cx,
            cy,
            cx + (dx * X) / 2,
            cy + (dy * Y) / 2,
          );
        }
        g.lineStyle(2, 0xe7d49b).strokeCircle(cx, cy, 6);
        this.arrow(g, cx, cy, p.outlet, 0xe7d49b, 4);
      }
      for (const t of snapshot.pressureVessels) {
        if (hiddenLiquid(t)) continue;
        this.box(g, t, 0xab9667, 0x574a32, 12);
        g.lineStyle(3, 0xe7d49b).strokeEllipse(
          (t.x + t.width / 2) * X,
          (t.y + t.height / 2) * Y - 10,
          t.width * X - 12,
          t.height * Y - 12,
        );
        if (
          "containmentProfileId" in t &&
          t.containmentProfileId !== "standard"
        )
          g.lineStyle(2, 0xe5c481).strokeRect(
            t.x * X + 5,
            t.y * Y + 5,
            t.width * X - 10,
            t.height * Y - 10,
          );
        const input = socket(t, t, false),
          output = socket(t, t, true);
        for (const [p, tint] of [
          [input, 0x9bd0c4],
          [output, 0xe5c481],
        ] as const)
          this.arrow(g, (p.x + 0.5) * X, (p.y + 0.5) * Y, t.direction, tint, 5);
        const label = this.text(
          (t.x + t.width / 2) * X,
          (t.y + t.height) * Y + 12,
          "",
          9,
        );
        this.labels.set(t.id, label);
        this.structures.add(label);
      }
      for (const p of snapshot.compressors) {
        if (hiddenLiquid(p)) continue;
        this.box(g, { ...p, width: 1, height: 1 }, 0xc3ad79, 0x574a32, 7);
        this.arrow(
          g,
          (p.x + 0.5) * X,
          (p.y + 0.5) * Y,
          p.direction,
          0xe5c481,
          5,
        );
        const label = this.text((p.x + 0.5) * X, (p.y + 1) * Y + 12, "", 8);
        this.labels.set(p.id, label);
        this.structures.add(label);
      }
      for (const p of snapshot.pipes) {
        if (hiddenLiquid(p)) continue;
        const cx = (p.x + 0.5) * X,
          cy = (p.y + 0.5) * Y,
          vectors = [
            [1, 0],
            [0, 1],
            [-1, 0],
            [0, -1],
          ];
        for (const side of [p.inlet, p.outlet]) {
          const [dx, dy] = vectors[side];
          g.lineStyle(10, 0x658a91).lineBetween(
            cx,
            cy,
            cx + (dx * X) / 2,
            cy + (dy * Y) / 2,
          );
          g.lineStyle(5, 0x183238).lineBetween(
            cx,
            cy,
            cx + (dx * X) / 2,
            cy + (dy * Y) / 2,
          );
        }
        if (p.containmentProfileId !== "standard")
          g.lineStyle(2, 0xe5c481).strokeCircle(cx, cy, 8);
        this.artImage(
          "logistics-pipe",
          cx,
          cy,
          X,
          Y,
          p.outlet * (Math.PI / 2),
          0.62,
        );
        this.arrow(g, cx, cy, p.outlet, 0xa9dce3, 4);
      }
      for (const t of snapshot.tanks) {
        if (hiddenLiquid(t)) continue;
        this.box(g, t, 0x729ca5, 0x36535b, 12);
        const input = socket(t, t, false),
          output = socket(t, t, true);
        for (const [p, tint] of [
          [input, 0x9bd0c4],
          [output, 0xe5c481],
        ] as const)
          this.arrow(g, (p.x + 0.5) * X, (p.y + 0.5) * Y, t.direction, tint, 5);
        const label = this.text(
          (t.x + t.width / 2) * X,
          (t.y + t.height) * Y + 12,
          "",
          9,
        );
        this.labels.set(t.id, label);
        this.structures.add(label);
      }
      for (const p of snapshot.pumps) {
        if (hiddenLiquid(p)) continue;
        this.box(
          g,
          { ...p, width: 1, height: 1 },
          p.incident
            ? p.incident.drainEnabled
              ? 0xe5c481
              : 0xe57865
            : 0x88b1b6,
          0x36535b,
          7,
        );
        if (p.containmentProfileId !== "standard")
          g.lineStyle(2, 0xe5c481).strokeCircle(
            (p.x + 0.5) * X,
            (p.y + 0.5) * Y,
            10,
          );
        this.arrow(
          g,
          (p.x + 0.5) * X,
          (p.y + 0.5) * Y,
          p.direction,
          0xe5c481,
          5,
        );
        const label = this.text((p.x + 0.5) * X, (p.y + 1) * Y + 12, "", 8);
        this.labels.set(p.id, label);
        this.structures.add(label);
      }
      for (const f of snapshot.factories) {
        const x = f.x * X,
          y = f.y * Y,
          w = f.width * X,
          h = f.height * Y;
        if (!mode.openFactories.includes(f.id)) {
          this.box(g, f, 0x69765f, 0x44513f, 15);
          this.artImage(
            "factory-shell",
            x + w / 2,
            y + h + 5,
            w + 16,
            h + 42,
            0,
            0.82,
          );
          for (let i = 12; i < h; i += 14)
            g.lineStyle(2, 0x354933, 0.4).lineBetween(
              x + 8,
              y + i - 15,
              x + w - 8,
              y + i - 15,
            );
          this.structures.add(
            this.text(
              x + w / 2,
              y + h / 2 - 16,
              "FACTORY " + f.id.slice(1),
              16,
              "#d0d4b7",
            ),
          );
          const label = this.text(x + w / 2, y + h / 2 + 8, "", 10);
          this.labels.set(f.id, label);
          this.structures.add(label);
        } else {
          g.fillStyle(0x68775b)
            .fillRect(x, y - 5, w, Y + 5)
            .fillRect(x, y, X, h)
            .fillRect(x + w - X, y, X, h)
            .fillRect(x, y + h - Y, w, Y);
          g.lineStyle(2, 0xa1ac88, 0.65).strokeRect(x, y - 5, w, h + 5);
        }
        for (const p of f.ports) {
          g.fillStyle(0x283b31).fillRect(
            p.x * X + 2,
            p.y * Y + 2,
            X - 4,
            Y - 4,
          );
          this.arrow(
            g,
            (p.x + 0.5) * X,
            (p.y + 0.5) * Y,
            p.direction,
            0xafd1bd,
            6,
          );
        }
      }
      this.dirty = false;
    }
    refresh() {
      if (!this.dynamic) return;
      for (const m of snapshot.machines)
        this.labels
          .get(m.id)
          ?.setText(
            m.status === "processing" ? "" : machineStatusLabel(m.status),
          )
          .setColor(m.status === "needs-fuel" ? "#e5ad75" : "#c0c6a9");
      for (const t of snapshot.storages) {
        const n = Object.values(t.inventory).reduce((a, b) => a + b, 0);
        this.labels
          .get(t.id)
          ?.setText(n + " / " + t.capacity)
          .setColor(n >= t.capacity ? "#e5ad75" : "#c0c6a9");
      }
      for (const t of snapshot.pressureVessels)
        this.labels.get(t.id)?.setText(t.quantity + " / " + t.capacity);
      for (const p of snapshot.compressors)
        this.labels.get(p.id)?.setText(translate("ui.gas.short." + p.status));
      for (const t of snapshot.tanks)
        this.labels.get(t.id)?.setText(t.quantity + " / " + t.capacity);
      for (const p of snapshot.pumps)
        this.labels
          .get(p.id)
          ?.setText(translate("ui.liquid.short." + p.status));
      for (const f of snapshot.factories) {
        const presentation = factoryContractPresentation(f, (id) => {
          const key = snapshot.materials.find((m) => m.id === id)?.nameKey;
          return key ? translate(key) : "Unidentified material";
        });
        this.labels
          .get(f.id)
          ?.setText(presentation.worldText)
          .setColor(presentation.certified ? "#d2e5ad" : "#e5ad75");
      }
      const discovered = snapshot.observations.filter((o) => !o.initial);
      for (const o of unseenObservations(discovered, this.seenDiscoveries)) {
        const id = observationKey(o);
        this.seenDiscoveries.add(id);
        // Restored knowledge has no new physical event to announce.
        if (!o.observedAt) continue;
        const outputKey = snapshot.materials.find(
          (m) => m.id === o.outputId,
        )?.nameKey;
        const note = this.text(
          o.observedAt.x * X,
          o.observedAt.y * Y - 60,
          "DISCOVERED: " + (outputKey ? translate(outputKey) : o.outputId),
          13,
          "#d2e5ad",
        ).setDepth(900);
        this.notices.push(note);
        this.tweens.add({
          targets: note,
          y: note.y - 55,
          alpha: 0,
          duration: 5000,
          onComplete: () => {
            note.destroy();
            this.notices = this.notices.filter((a) => a !== note);
          },
        });
      }
      this.seenDiscoveries = new Set(snapshot.observations.map(observationKey));
    }
    update(_time: number, delta: number) {
      if (!this.dynamic) return;
      recordBrowserMetric("frame-interval", delta);
      const dynamicDrawStartedAt = startBrowserMetric();
      if (this.dirty) {
        this.rebuild();
        this.refresh();
      }
      const camera = this.cameras.main;
      if (
        camera.width !== this.viewportWidth ||
        camera.height !== this.viewportHeight
      ) {
        this.viewportWidth = camera.width;
        this.viewportHeight = camera.height;
        this.navigation.resize(camera.width, camera.height);
      }
      const speed =
        (Math.min(delta, 50) * 0.7 * preferences.camera.panSpeed) /
        this.navigation.getView().zoom;
      if (!editing()) {
        const x =
          Number(this.keys.has("d") || this.keys.has("arrowright")) -
          Number(this.keys.has("a") || this.keys.has("arrowleft"));
        const y =
          Number(this.keys.has("s") || this.keys.has("arrowdown")) -
          Number(this.keys.has("w") || this.keys.has("arrowup"));
        if (x || y) {
          const scale = x && y ? Math.SQRT1_2 : 1;
          this.navigation.panByWorld(x * speed * scale, y * speed * scale);
        }
      }
      this.applyCamera(this.navigation.advance(delta));
      this.grid.setVisible(mode.tool !== "select");
      const g = this.dynamic;
      g.clear();
      for (const b of snapshot.belts) {
        if (
          !b.cargo ||
          snapshot.factories.some(
            (f) => contains(f, b) && !mode.openFactories.includes(f.id),
          )
        )
          continue;
        const material = snapshot.materials.find((m) => m.id === b.cargo);
        g.fillStyle(color(material?.color ?? "#dad5b8")).fillRoundedRect(
          b.x * X + 11,
          b.y * Y + 7,
          10,
          10,
          2,
        );
      }
      for (const m of snapshot.machines) {
        if (m.factoryId && !mode.openFactories.includes(m.factoryId)) continue;
        g.fillStyle(
          m.status === "processing"
            ? 0xb2d68a
            : m.enabled
              ? 0xd6a66e
              : 0x727866,
        ).fillCircle((m.x + m.width) * X - 8, m.y * Y - 1, 3);
        if (m.job) {
          g.fillStyle(0x151e15).fillRect(
            m.x * X,
            (m.y + m.height) * Y - 2,
            m.width * X,
            3,
          );
          g.fillStyle(0xb5d38c).fillRect(
            m.x * X,
            (m.y + m.height) * Y - 2,
            m.width * X * m.progress,
            3,
          );
        }
      }
      for (const p of snapshot.pressureLines) {
        if (
          !p.quantity ||
          snapshot.factories.some(
            (f) => contains(f, p) && !mode.openFactories.includes(f.id),
          )
        )
          continue;
        const mat = snapshot.materials.find((m) => m.id === p.materialId);
        g.fillStyle(color(mat?.color ?? "#dbbf7f")).fillRect(
          p.x * X + 3,
          p.y * Y + Y - 4,
          ((X - 6) * p.quantity) / snapshot.gasLogistics!.line.capacity,
          3,
        );
      }
      for (const p of snapshot.pipes) {
        if (
          !p.quantity ||
          snapshot.factories.some(
            (f) => contains(f, p) && !mode.openFactories.includes(f.id),
          )
        )
          continue;
        const mat = snapshot.materials.find((m) => m.id === p.materialId);
        g.fillStyle(color(mat?.color ?? "#69bac8")).fillRect(
          p.x * X + 3,
          p.y * Y + Y - 4,
          ((X - 6) * p.quantity) / snapshot.liquidLogistics!.pipe.capacity,
          3,
        );
      }
      const selectedRoute = [
          ...snapshot.undergroundSolids,
          ...snapshot.undergroundLiquids,
          ...snapshot.elevatedSolids,
        ].find((route) => route.id === mode.selected),
        selected =
          snapshot.machines.find((m) => m.id === mode.selected) ??
          snapshot.factories.find((f) => f.id === mode.selected) ??
          snapshot.storages.find((t) => t.id === mode.selected) ??
          snapshot.pressureVessels.find((t) => t.id === mode.selected) ??
          snapshot.tanks.find((t) => t.id === mode.selected) ??
          [
            ...snapshot.pipes,
            ...snapshot.pumps,
            ...snapshot.pressureLines,
            ...snapshot.compressors,
          ]
            .filter((p) => p.id === mode.selected)
            .map((p) => ({ ...p, width: 1, height: 1 }))[0] ??
          (selectedRoute
            ? {
                x: Math.min(selectedRoute.entry.x, selectedRoute.exit.x),
                y: Math.min(selectedRoute.entry.y, selectedRoute.exit.y),
                width: Math.abs(selectedRoute.exit.x - selectedRoute.entry.x) + 1,
                height: Math.abs(selectedRoute.exit.y - selectedRoute.entry.y) + 1,
              }
            : mode.selected === "terminal"
              ? snapshot.map.terminal
              : null);
      if (selected)
        g.lineStyle(2, 0xe3c78a, 0.85).strokeRect(
          selected.x * X - 3,
          selected.y * Y - 14,
          selected.width * X + 6,
          selected.height * Y + 17,
        );
      const ghost = this.ghost;
      ghost.clear();
      this.tooltip.setVisible(false);
      if (!this.hover || mode.tool === "select") {
        finishBrowserMetric("world-dynamic-draw", dynamicDrawStartedAt);
        return;
      }
      const command = buildCommand(mode, snapshot, this.hover, this.anchor);
      if (!command) {
        finishBrowserMetric("world-dynamic-draw", dynamicDrawStartedAt);
        return;
      }
      const result = actions.preview(command),
        tint = result.ok ? 0xbdd79f : 0xe79b7c;
      ghost.fillStyle(tint, 0.2).lineStyle(2, tint, 0.8);
      if (
        command.type === "placeElevatedSolid" ||
        command.type === "placeUndergroundSolid" ||
        command.type === "placeUndergroundLiquid"
      ) {
        const raised = command.type === "placeElevatedSolid",
          lift = raised ? 14 : 0,
          sx = (command.entry.x + 0.5) * X,
          sy = (command.entry.y + 0.5) * Y,
          ex = (command.exit.x + 0.5) * X,
          ey = (command.exit.y + 0.5) * Y;
        ghost
          .lineStyle(raised ? 7 : 3, tint, 0.75)
          .lineBetween(sx, sy - lift, ex, ey - lift);
        if (raised) {
          const span =
              Math.abs(command.exit.x - command.entry.x) +
              Math.abs(command.exit.y - command.entry.y),
            dx = Math.sign(command.exit.x - command.entry.x),
            dy = Math.sign(command.exit.y - command.entry.y),
            maxSupport = snapshot.map.elevatedSolid.maxSupportSpan,
            supports = [0];
          for (
            let distance = maxSupport;
            distance < span;
            distance += maxSupport
          )
            supports.push(distance);
          if (supports.at(-1) !== span) supports.push(span);
          for (const distance of supports) {
            const x = (command.entry.x + dx * distance + 0.5) * X,
              y = (command.entry.y + dy * distance + 0.5) * Y;
            ghost
              .fillStyle(tint, 0.2)
              .fillRect(x - X / 2, y - Y / 2, X, Y)
              .lineStyle(2, tint, 0.9)
              .strokeRect(x - X / 2, y - Y / 2, X, Y)
              .lineBetween(x, y, x, y - lift);
          }
        } else
          for (const portal of [command.entry, command.exit])
            ghost
              .fillStyle(tint, 0.2)
              .fillRect(portal.x * X, portal.y * Y, X, Y)
              .lineStyle(2, tint, 0.9)
              .strokeRect(portal.x * X, portal.y * Y, X, Y);
      } else if (command.type === "placeFactory") {
        ghost
          .fillRect(
            command.x * X,
            command.y * Y,
            command.width * X,
            command.height * Y,
          )
          .strokeRect(
            command.x * X,
            command.y * Y,
            command.width * X,
            command.height * Y,
          );
      } else if (
        command.type === "placeMachine" ||
        command.type === "placeStorage" ||
        command.type === "placeTank" ||
        command.type === "placePressureVessel"
      ) {
        const d =
          command.type === "placeMachine"
            ? snapshot.definitions.find((d) => d.id === command.definitionId)!
            : command.type === "placePressureVessel"
              ? snapshot.gasLogistics!.vessel
              : command.type === "placeTank"
                ? snapshot.liquidLogistics!.tank
                : snapshot.storageDefinitions.find(
                    (d) => d.id === command.definitionId,
                  )!;
        const w = command.direction % 2 ? d.height : d.width,
          h = command.direction % 2 ? d.width : d.height;
        ghost
          .fillRect(command.x * X, command.y * Y, w * X, h * Y)
          .strokeRect(command.x * X, command.y * Y, w * X, h * Y);
        const output = socket(command, d, true);
        this.arrow(
          ghost,
          (output.x + 0.5) * X,
          (output.y + 0.5) * Y,
          command.direction,
          tint,
          7,
        );
      } else if (
        command.type === "placePipes" ||
        command.type === "placePressureLines"
      ) {
        for (const p of command.points) {
          ghost
            .fillRect(p.x * X, p.y * Y, X, Y)
            .strokeRect(p.x * X, p.y * Y, X, Y);
          this.arrow(
            ghost,
            (p.x + 0.5) * X,
            (p.y + 0.5) * Y,
            p.outlet,
            tint,
            5,
          );
        }
      } else if (command.type === "placeBelts")
        for (let i = 0; i < command.points.length; i++) {
          const p = command.points[i],
            n = command.points[i + 1],
            dir = n
              ? n.x > p.x
                ? 0
                : n.y > p.y
                  ? 1
                  : n.x < p.x
                    ? 2
                    : 3
              : command.direction;
          ghost
            .fillStyle(tint, 0.2)
            .fillRect(p.x * X, p.y * Y, X, Y)
            .lineStyle(1, tint)
            .strokeRect(p.x * X, p.y * Y, X, Y);
          this.arrow(ghost, (p.x + 0.5) * X, (p.y + 0.5) * Y, dir, tint, 5);
        }
      else {
        ghost
          .fillRect(this.hover.x * X, this.hover.y * Y, X, Y)
          .strokeRect(this.hover.x * X, this.hover.y * Y, X, Y);
        if (command.type === "placePort" || command.type === "placePump")
          this.arrow(
            ghost,
            (command.x + 0.5) * X,
            (command.y + 0.5) * Y,
            command.direction,
            tint,
            7,
          );
      }
      this.tooltip
        .setVisible(true)
        .setPosition((this.hover.x + 1) * X, (this.hover.y + 1) * Y + 12)
        .setText(
          this.hover.x +
            "," +
            this.hover.y +
            "  " +
            (result.messageKey
              ? translate(result.messageKey)
              : result.message) +
            (result.cost ? " · " + result.cost + " " + this.buildUnit() : ""),
        )
        .setColor(result.ok ? "#d3e4ba" : "#f0ba9a");
      finishBrowserMetric("world-dynamic-draw", dynamicDrawStartedAt);
    }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#343d30",
    antialias: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth,
      height: parent.clientHeight,
    },
    scene: Site,
    audio: { noAudio: true },
    render: { roundPixels: true },
  });
  return {
    setSnapshot: (s) => {
      const startedAt = startBrowserMetric();
      const events = deriveFeedbackEvents(snapshot, s);
      snapshot = s;
      const k = computeStructureKey(s);
      if (k !== structureKey) {
        structureKey = k;
        scene?.markDirty();
      }
      scene?.feedback(events);
      scene?.refresh();
      finishBrowserMetric("world-sync", startedAt);
    },
    setMode: (m) => {
      const rebuild = mode.openFactories.join() !== m.openFactories.join();
      mode = m;
      if (rebuild) scene?.markDirty();
    },
    setPreferences: (next) => {
      preferences = next;
      scene?.setCameraPreferences(next);
    },
    getCameraView: () => scene?.getCameraView() ?? null,
    projectWorldPoint: (x, y) => scene?.projectWorldPoint(x, y) ?? null,
    home: () => scene?.home(),
    destroy: () => {
      if (!destroyed) {
        destroyed = true;
        feedbackAudio.destroy();
        scene = undefined;
        game.destroy(true);
      }
    },
  };
}
