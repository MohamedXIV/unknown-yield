/**
 * Phaser-owned presentation camera math. No simulation state, DOM reads, or
 * browser API are required here: world.ts owns the actual Phaser camera.
 *
 * IMPORTANT: Phaser's scroll is NOT the visible world's top-left at zoom != 1.
 * The center of the view is scroll + viewport / 2 (independent of zoom);
 * the visible half-extent is viewport / (2 * zoom).
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
const MIN_HOME_ZOOM_RATIO = 0.65; // At most ~1.54x the Home field of view.
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
  const halfViewport = viewport / 2;
  const halfVisible = halfViewport / zoom;
  // Phaser.scroll = visibleWorldCenter - halfViewport, NOT visibleWorldLeft.
  // If the world is smaller than the viewport, center it on that axis.
  if (2 * halfVisible >= world) return world / 2 - halfViewport;
  return clamp(
    scroll,
    halfVisible - halfViewport,
    world - halfVisible - halfViewport,
  );
}

function worldAtScreen(
  scroll: number,
  screen: number,
  viewport: number,
  zoom: number,
): number {
  return scroll + viewport / 2 + (screen - viewport / 2) / zoom;
}

function scrollForScreenAnchor(
  world: number,
  screen: number,
  viewport: number,
  zoom: number,
): number {
  return world - viewport / 2 - (screen - viewport / 2) / zoom;
}

function validateGeometry(geometry: CameraGeometry): CameraGeometry {
  return {
    worldWidth: positive(geometry.worldWidth, 1),
    worldHeight: positive(geometry.worldHeight, 1),
    viewportWidth: positive(geometry.viewportWidth, 1),
    viewportHeight: positive(geometry.viewportHeight, 1),
  };
}

/**
 * Never show outside the generated map. Preserve a comfortable zoom-out floor
 * proportional to Home, instead of allowing the historical 0.12x zoom.
 * For a very small world / large display, raise maxZoom as well.
 */
export function cameraZoomLimits(
  geometry: CameraGeometry,
  homeZoom: number,
): { minZoom: number; maxZoom: number } {
  const g = validateGeometry(geometry);
  const coverWorld = Math.max(
    g.viewportWidth / g.worldWidth,
    g.viewportHeight / g.worldHeight,
  );
  const minZoom = Math.max(
    coverWorld,
    positive(homeZoom, 1) * MIN_HOME_ZOOM_RATIO,
  );
  return { minZoom, maxZoom: Math.max(DEFAULT_MAX_ZOOM, minZoom * 2) };
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

  /** Map geometry is source-of-truth; supports different generated map sizes. */
  setWorldSize(worldWidth: number, worldHeight: number): void {
    this.geometry = validateGeometry({
      ...this.geometry,
      worldWidth,
      worldHeight,
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
      scrollX: finite(worldX, 0) - this.geometry.viewportWidth / 2,
      scrollY: finite(worldY, 0) - this.geometry.viewportHeight / 2,
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
    // Pointer/touch dragging is a physical grab: no trailing easing or
    // catch-up after the pointer stops. Keyboard/Home remain smoothed.
    const zoom = this.current.zoom;
    this.anchor = null;
    this.current = this.bound({
      ...this.current,
      scrollX: this.current.scrollX - finite(dx, 0) / zoom,
      scrollY: this.current.scrollY - finite(dy, 0) / zoom,
    });
    this.target = this.bound({
      ...this.target,
      scrollX: this.current.scrollX,
      scrollY: this.current.scrollY,
    });
    if (this.motion === "instant") this.snap();
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
    const worldX = worldAtScreen(
      this.current.scrollX, x, this.geometry.viewportWidth, this.current.zoom,
    );
    const worldY = worldAtScreen(
      this.current.scrollY, y, this.geometry.viewportHeight, this.current.zoom,
    );
    this.anchor = { x, y, worldX, worldY };
    this.target = this.bound({
      zoom: z,
      scrollX: scrollForScreenAnchor(worldX, x, this.geometry.viewportWidth, z),
      scrollY: scrollForScreenAnchor(worldY, y, this.geometry.viewportHeight, z),
    });
    if (this.motion === "instant") this.snap();
  }

  /**
   * Combined two-finger pan and pinch: the world point previously under the
   * old gesture center follows the new gesture center as zoom converges.
   * This does not touch build commands or authoritative simulation state.
   */
  pinchBy(
    factor: number,
    previousCenter: { x: number; y: number },
    currentCenter: { x: number; y: number },
  ): void {
    if (
      !Number.isFinite(factor) ||
      factor <= 0 ||
      !Number.isFinite(previousCenter.x) ||
      !Number.isFinite(previousCenter.y) ||
      !Number.isFinite(currentCenter.x) ||
      !Number.isFinite(currentCenter.y)
    ) return;
    const worldX = worldAtScreen(
      this.current.scrollX, previousCenter.x,
      this.geometry.viewportWidth, this.current.zoom,
    );
    const worldY = worldAtScreen(
      this.current.scrollY, previousCenter.y,
      this.geometry.viewportHeight, this.current.zoom,
    );
    const zoom = clamp(this.target.zoom * factor, this.minZoom, this.maxZoom);
    this.anchor = {
      x: currentCenter.x,
      y: currentCenter.y,
      worldX,
      worldY,
    };
    this.target = this.bound({
      zoom,
      scrollX: scrollForScreenAnchor(
        worldX, currentCenter.x, this.geometry.viewportWidth, zoom,
      ),
      scrollY: scrollForScreenAnchor(
        worldY, currentCenter.y, this.geometry.viewportHeight, zoom,
      ),
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
          scrollX: scrollForScreenAnchor(
            this.anchor.worldX, this.anchor.x, this.geometry.viewportWidth, zoom,
          ),
          scrollY: scrollForScreenAnchor(
            this.anchor.worldY, this.anchor.y, this.geometry.viewportHeight, zoom,
          ),
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
