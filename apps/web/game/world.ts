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
  TOOL_HOTKEYS,
  structureKey as computeStructureKey,
  type WorldMode,
  type Tool,
} from "./interaction";
import { t as translate } from "./i18n";
import { machineStatusLabel } from "./machine-status";
import { observationKey, unseenObservations } from "./observations";
import { factoryContractPresentation } from "./factory-presentation";
import { beltPresentations } from "./belt-presentation";
export type WorldControls = {
  setSnapshot(s: PlayerSnapshot): void;
  setMode(mode: WorldMode): void;
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
const X = 32,
  Y = 24;
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
): WorldControls {
  let snapshot = initial,
    mode = initialMode,
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
    private dirty = true;
    private seenDiscoveries = new Set(initial.observations.map(observationKey));
    private notices: Phaser.GameObjects.Text[] = [];
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
      this.input.mouse?.disableContextMenu();
      this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
        if (p.isDown && (p.rightButtonDown() || p.middleButtonDown())) {
          this.cameras.main.scrollX -=
            (p.x - p.prevPosition.x) / this.cameras.main.zoom;
          this.cameras.main.scrollY -=
            (p.y - p.prevPosition.y) / this.cameras.main.zoom;
        }
        this.hover = this.cell(p);
      });
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
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
        ) => {
          const camera = this.cameras.main,
            world = camera.getWorldPoint(p.x, p.y);
          camera.setZoom(
            Phaser.Math.Clamp(camera.zoom * (dy > 0 ? 0.9 : 1.1), 0.4, 2.5),
          );
          const after = camera.getWorldPoint(p.x, p.y);
          camera.scrollX += world.x - after.x;
          camera.scrollY += world.y - after.y;
        },
      );
      const down = (e: KeyboardEvent) => {
        if (editing()) return;
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
        const hotkeys: Record<string, Tool> = Object.fromEntries(
          Object.entries(TOOL_HOTKEYS)
            .filter(([, label]) => label !== "↖")
            .map(([tool, label]) => [label.toLowerCase(), tool as Tool]),
        );
        if (hotkeys[k]) actions.mode(hotkeys[k]);
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
      this.home();
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
    home() {
      const camera = this.cameras.main;
      camera
        .setZoom(
          Math.min(this.scale.width / (36 * X), this.scale.height / (27 * Y)),
        )
        .centerOn(29 * X, 30 * Y);
    }
    markDirty() {
      this.dirty = true;
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
          y = (m.y + m.height / 2) * Y;
        if (m.role === "extractor") {
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
      for (const f of snapshot.factories) {
        const x = f.x * X,
          y = f.y * Y,
          w = f.width * X,
          h = f.height * Y;
        if (!mode.openFactories.includes(f.id)) {
          this.box(g, f, 0x69765f, 0x44513f, 15);
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
      if (this.dirty) {
        this.rebuild();
        this.refresh();
      }
      const camera = this.cameras.main,
        speed = (delta * 0.7) / camera.zoom;
      if (!editing()) {
        if (this.keys.has("a") || this.keys.has("arrowleft"))
          camera.scrollX -= speed;
        if (this.keys.has("d") || this.keys.has("arrowright"))
          camera.scrollX += speed;
        if (this.keys.has("w") || this.keys.has("arrowup"))
          camera.scrollY -= speed;
        if (this.keys.has("s") || this.keys.has("arrowdown"))
          camera.scrollY += speed;
      }
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
      const selected =
        snapshot.machines.find((m) => m.id === mode.selected) ??
        snapshot.factories.find((f) => f.id === mode.selected) ??
        snapshot.storages.find((t) => t.id === mode.selected) ??
        (mode.selected === "terminal" ? snapshot.map.terminal : null);
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
      if (!this.hover || mode.tool === "select") return;
      const command = buildCommand(mode, snapshot, this.hover, this.anchor);
      if (!command) return;
      const result = actions.preview(command),
        tint = result.ok ? 0xbdd79f : 0xe79b7c;
      ghost.fillStyle(tint, 0.2).lineStyle(2, tint, 0.8);
      if (command.type === "placeFactory") {
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
        command.type === "placeStorage"
      ) {
        const d =
          command.type === "placeMachine"
            ? snapshot.definitions.find((d) => d.id === command.definitionId)!
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
        if (command.type === "placePort")
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
            result.message +
            (result.cost ? " · " + result.cost + " " + this.buildUnit() : ""),
        )
        .setColor(result.ok ? "#d3e4ba" : "#f0ba9a");
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
      snapshot = s;
      const k = computeStructureKey(s);
      if (k !== structureKey) {
        structureKey = k;
        scene?.markDirty();
      }
      scene?.refresh();
    },
    setMode: (m) => {
      const rebuild = mode.openFactories.join() !== m.openFactories.join();
      mode = m;
      if (rebuild) scene?.markDirty();
    },
    home: () => scene?.home(),
    destroy: () => {
      if (!destroyed) {
        destroyed = true;
        scene = undefined;
        game.destroy(true);
      }
    },
  };
}
