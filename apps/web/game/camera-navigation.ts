/**
 * Phaser-owned presentation camera math. No simulation state, DOM reads, or
 * browser API are required here: world.ts owns the actual Phaser camera.
 */
export type CameraView = {
  scrollX: number;
  scrollY: number;
  zoom: number;
};

export type CameraGeometry = {
  worldWidth: number;
  worldHeight: number;
  viewportWidth: number;
  viewportHeight: number;
};

export type CameraMotion = "smooth" | "instant";

export type CameraNavigationOptions = {
  minZoom?: number;
  maxZoom?: number;
  halfLifeMs?: number;
  motion?: CameraMotion;
};

type ZoomAnchor = { x: number; y: number; worldX: number; worldY: number };

const DEFAULT_MIN_ZOOM = 0.12;
const DEFAULT_MAX_ZOOM = 2.5;
const DEFAULT_HALF_LIFE_MS = 100;
const LN2 = Math.log(2);
const EPSILON = 0.00001;

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function boundedScroll(
  scroll: number,
  world: number,
  viewport: number,
  zoom: number,
): number {
  const visibleWorld = viewport / zoom;
  // For smaller worlds, keep them centered instead of creating empty edge drift.
  if (visibleWorld >= world) return (world - visibleWorld) / 2;
  return clamp(scroll, 0, world - visibleWorld);
}

function validateGeometry(geometry: CameraGeometry): CameraGeometry {
  return {
    worldWidth: positive(geometry.worldWidth, 1),
    worldHeight: positive(geometry.worldHeight, 1),
    viewportWidth: positive(geometry.viewportWidth, 1),
    viewportHeight: positive(geometry.viewportHeight, 1),
  };
}

export class CameraNavigation {
  private geometry: CameraGeometry;
  private current: CameraView;
  private target: CameraView;
  private anchor: ZoomAnchor | null = null;
  private minZoom: number;
  private maxZoom: number;
  private halfLifeMs: number;
  private motion: CameraMotion;

  constructor(
    geometry: CameraGeometry,
    initial: CameraView,
    options: CameraNavigationOptions = {},
  ) {
    this.geometry = validateGeometry(geometry);
    this.minZoom = positive(options.minZoom ?? DEFAULT_MIN_ZOOM, DEFAULT_MIN_ZOOM);
    this.maxZoom = Math.max(
      this.minZoom,
      positive(options.maxZoom ?? DEFAULT_MAX_ZOOM, DEFAULT_MAX_ZOOM),
    );
    this.halfLifeMs = positive(
      options.halfLifeMs ?? DEFAULT_HALF_LIFE_MS,
      DEFAULT_HALF_LIFE_MS,
    );
    this.motion = options.motion ?? "smooth";
    this.current = this.bound(initial);
    this.target = { ...this.current };
  }

  getView(): CameraView {
    return { ...this.current };
  }

  getTarget(): CameraView {
    return { ...this.target };
  }

  setMotion(motion: CameraMotion): void {
    this.motion = motion;
    if (motion === "instant") this.snap();
  }

  setHalfLifeMs(value: number): void {
    this.halfLifeMs = positive(value, DEFAULT_HALF_LIFE_MS);
  }

  setZoomLimits(min: number, max: number): void {
    this.minZoom = positive(min, DEFAULT_MIN_ZOOM);
    this.maxZoom = Math.max(this.minZoom, positive(max, DEFAULT_MAX_ZOOM));
    this.current = this.bound(this.current);
    this.target = this.bound(this.target);
    this.anchor = null;
  }

  resize(viewportWidth: number, viewportHeight: number): void {
    this.geometry = validateGeometry({
      ...this.geometry,
      viewportWidth,
      viewportHeight,
    });
    this.current = this.bound(this.current);
    this.target = this.bound(this.target);
    this.anchor = null;
  }

  /** Initialize from the camera's world scroll/zoom without animation. */
  reset(view: CameraView): void {
    this.anchor = null;
    this.current = this.bound(view);
    this.target = { ...this.current };
  }

  /** A Home action can smoothly retarget the camera, or snap in instant mode. */
  centerOn(worldX: number, worldY: number, zoom = this.target.zoom): void {
    const z = clamp(finite(zoom, this.target.zoom), this.minZoom, this.maxZoom);
    this.anchor = null;
    this.target = this.bound({
      zoom: z,
      scrollX: finite(worldX, 0) - this.geometry.viewportWidth / (2 * z),
      scrollY: finite(worldY, 0) - this.geometry.viewportHeight / (2 * z),
    });
    if (this.motion === "instant") this.snap();
  }

  panByWorld(dx: number, dy: number): void {
    this.anchor = null;
    this.target = this.bound({
      ...this.target,
      scrollX: this.target.scrollX + finite(dx, 0),
      scrollY: this.target.scrollY + finite(dy, 0),
    });
    if (this.motion === "instant") this.snap();
  }

  panByScreen(dx: number, dy: number): void {
    const zoom = this.current.zoom;
    this.panByWorld(-finite(dx, 0) / zoom, -finite(dy, 0) / zoom);
  }

  /**
   * Zoom toward a viewport-local point. While the zoom interpolates, the
   * world point under the cursor stays pinned to that point unless world
   * boundaries prevent it. New pan/Home input cancels the anchor.
   */
  zoomAt(factor: number, screenX: number, screenY: number): void {
    if (!Number.isFinite(factor) || factor <= 0) return;
    const x = finite(screenX, this.geometry.viewportWidth / 2);
    const y = finite(screenY, this.geometry.viewportHeight / 2);
    const z = clamp(this.target.zoom * factor, this.minZoom, this.maxZoom);
    if (Math.abs(z - this.target.zoom) < EPSILON) return;
    const worldX = this.current.scrollX + x / this.current.zoom;
    const worldY = this.current.scrollY + y / this.current.zoom;
    this.anchor = { x, y, worldX, worldY };
    this.target = this.bound({
      zoom: z,
      scrollX: worldX - x / z,
      scrollY: worldY - y / z,
    });
    if (this.motion === "instant") this.snap();
  }

  /** Call once per frame, regardless of whether simulation time is paused. */
  advance(deltaMs: number): CameraView {
    if (this.motion === "instant") {
      this.snap();
      return this.getView();
    }
    const delta = Math.max(0, finite(deltaMs, 0));
    const weight = 1 - Math.exp((-LN2 * delta) / this.halfLifeMs);
    const zoom = this.current.zoom + (this.target.zoom - this.current.zoom) * weight;

    const next = this.anchor
      ? {
          zoom,
          scrollX: this.anchor.worldX - this.anchor.x / zoom,
          scrollY: this.anchor.worldY - this.anchor.y / zoom,
        }
      : {
          zoom,
          scrollX: this.current.scrollX +
            (this.target.scrollX - this.current.scrollX) * weight,
          scrollY: this.current.scrollY +
            (this.target.scrollY - this.current.scrollY) * weight,
        };
    this.current = this.bound(next);
    if (
      Math.abs(this.current.zoom - this.target.zoom) < EPSILON &&
      Math.abs(this.current.scrollX - this.target.scrollX) < EPSILON &&
      Math.abs(this.current.scrollY - this.target.scrollY) < EPSILON
    ) {
      this.snap();
    }
    return this.getView();
  }

  private snap(): void {
    this.current = { ...this.target };
    this.anchor = null;
  }

  private bound(view: CameraView): CameraView {
    const zoom = clamp(finite(view.zoom, 1), this.minZoom, this.maxZoom);
    return {
      zoom,
      scrollX: boundedScroll(
        finite(view.scrollX, 0),
        this.geometry.worldWidth,
        this.geometry.viewportWidth,
        zoom,
      ),
      scrollY: boundedScroll(
        finite(view.scrollY, 0),
        this.geometry.worldHeight,
        this.geometry.viewportHeight,
        zoom,
      ),
    };
  }
}
