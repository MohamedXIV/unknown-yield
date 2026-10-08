import { expect, it } from "vitest";
import {
  CameraNavigation,
  cameraZoomLimits,
  type CameraView,
  type CameraGeometry,
} from "../game/camera-navigation";

const geometry = {
  worldWidth: 6000,
  worldHeight: 4800,
  viewportWidth: 1200,
  viewportHeight: 800,
};

const initial = { scrollX: 900, scrollY: 700, zoom: 1.1 };

const close = (actual: number, expected: number, precision = 6) =>
  expect(actual).toBeCloseTo(expected, precision);

function visibleWorld(view: CameraView, g: CameraGeometry) {
  // Phaser 4: camera.midPoint = scroll + viewport/2, regardless of zoom.
  const halfWidth = g.viewportWidth / (2 * view.zoom);
  const halfHeight = g.viewportHeight / (2 * view.zoom);
  return {
    left: view.scrollX + g.viewportWidth / 2 - halfWidth,
    right: view.scrollX + g.viewportWidth / 2 + halfWidth,
    top: view.scrollY + g.viewportHeight / 2 - halfHeight,
    bottom: view.scrollY + g.viewportHeight / 2 + halfHeight,
  };
}

function worldAt(view: CameraView, g: CameraGeometry, x: number, y: number) {
  const bounds = visibleWorld(view, g);
  return {
    x: bounds.left + x / view.zoom,
    y: bounds.top + y / view.zoom,
  };
}

function expectInsideMap(view: CameraView, g: CameraGeometry) {
  const b = visibleWorld(view, g);
  expect(b.left).toBeGreaterThanOrEqual(-0.00001);
  expect(b.top).toBeGreaterThanOrEqual(-0.00001);
  expect(b.right).toBeLessThanOrEqual(g.worldWidth + 0.00001);
  expect(b.bottom).toBeLessThanOrEqual(g.worldHeight + 0.00001);
}

it("converges in frame-time-independent half-life steps", () => {
  const a = new CameraNavigation(geometry, initial);
  const b = new CameraNavigation(geometry, initial);
  a.panByWorld(420, -180);
  b.panByWorld(420, -180);
  const once = a.advance(100);
  b.advance(40);
  const split = b.advance(60);
  close(once.scrollX, split.scrollX);
  close(once.scrollY, split.scrollY);
  close(once.scrollX, 1110);
  close(once.scrollY, 610);
});

it("keeps the cursor world point fixed during an interpolated zoom", () => {
  const camera = new CameraNavigation(geometry, initial);
  const x = 300;
  const y = 260;
  const { x: worldX, y: worldY } = worldAt(initial, geometry, x, y);
  camera.zoomAt(1.5, x, y);

  for (const delta of [16, 25, 33, 50, 100, 200, 500, 5000]) {
    const view = camera.advance(delta);
    close(worldAt(view, geometry, x, y).x, worldX, 5);
    close(worldAt(view, geometry, x, y).y, worldY, 5);
  }
  close(camera.getView().zoom, 1.65);
});

it("retargets repeated zoom changes and permits interruption by panning", () => {
  const camera = new CameraNavigation(geometry, initial);
  camera.zoomAt(1.2, 400, 300);
  camera.advance(35);
  camera.zoomAt(1 / 1.2, 400, 300);
  camera.advance(5000);
  close(camera.getView().zoom, initial.zoom, 5);

  camera.zoomAt(1.8, 300, 150);
  camera.advance(50);
  camera.panByWorld(110, -80);
  camera.advance(8000);
  close(camera.getView().scrollX, camera.getTarget().scrollX);
  close(camera.getView().scrollY, camera.getTarget().scrollY);
});

it("implements smooth Home retargeting and a true instant reduced-motion mode", () => {
  const camera = new CameraNavigation(geometry, initial);
  camera.centerOn(1800, 1400, 1);
  expect(camera.getView()).toEqual(initial);
  expect(camera.getTarget()).toEqual({
    zoom: 1,
    scrollX: 1200,
    scrollY: 1000,
  });
  camera.advance(10000);
  expect(camera.getView()).toEqual(camera.getTarget());

  camera.centerOn(3000, 2000);
  camera.setMotion("instant");
  expect(camera.getView()).toEqual(camera.getTarget());
  camera.panByWorld(150, 90);
  expect(camera.getView()).toEqual(camera.getTarget());
  camera.zoomAt(1.2, 600, 400);
  expect(camera.getView()).toEqual(camera.getTarget());
});

it("clamps zoom, world edges and small worlds deterministically", () => {
  const camera = new CameraNavigation(
    geometry,
    initial,
    { motion: "instant", minZoom: 0.4, maxZoom: 2.5 },
  );
  camera.panByWorld(-100000, -100000);
  close(camera.getView().scrollX, 600 / 1.1 - 600);
  close(camera.getView().scrollY, 400 / 1.1 - 400);
  camera.zoomAt(100, 500, 300);
  expect(camera.getView().zoom).toBe(2.5);
  camera.panByWorld(100000, 100000);
  close(camera.getView().scrollX, 6000 - 600 - 600 / 2.5);
  close(camera.getView().scrollY, 4800 - 400 - 400 / 2.5);

  const small = new CameraNavigation(
    {
      worldWidth: 200,
      worldHeight: 100,
      viewportWidth: 800,
      viewportHeight: 600,
    },
    { zoom: 1, scrollX: 0, scrollY: 0 },
  );
  close(small.getView().scrollX, -300);
  close(small.getView().scrollY, -250);
  small.panByScreen(100, -80);
  close(small.getTarget().scrollX, -300);
  close(small.getTarget().scrollY, -250);
});

it("resizes without stale anchors or invalid viewport positioning", () => {
  const camera = new CameraNavigation(geometry, initial);
  camera.zoomAt(1.6, 100, 150);
  camera.advance(50);
  camera.resize(400, 300);
  camera.advance(10000);
  expect(camera.getView()).toEqual(camera.getTarget());
  camera.setMotion("instant");
  camera.centerOn(200, 250, 2);
  close(camera.getView().scrollX, 0);
  close(camera.getView().scrollY, 100);
});

it("never drifts when idle and tolerates invalid or huge frame deltas", () => {
  const camera = new CameraNavigation(geometry, initial);
  for (let i = 0; i < 100; i++) {
    expect(camera.advance(16)).toEqual(initial);
  }
  camera.panByWorld(200, 50);
  expect(Number.isFinite(camera.advance(Number.NaN).scrollX)).toBe(true);
  expect(Number.isFinite(camera.advance(-100).scrollY)).toBe(true);
  expect(camera.advance(1_000_000)).toEqual(camera.getTarget());
  for (let i = 0; i < 100; i++) {
    expect(camera.advance(16)).toEqual(camera.getTarget());
  }
});

it("pins the previous gesture center under a moving pinch midpoint", () => {
  const geometry = {
    worldWidth: 6000,
    worldHeight: 4800,
    viewportWidth: 1200,
    viewportHeight: 800,
  };
  const camera = new CameraNavigation(
    geometry,
    { scrollX: 800, scrollY: 600, zoom: 1 },
    { motion: "instant" },
  );

  const { x: worldX, y: worldY } = worldAt(
    { scrollX: 800, scrollY: 600, zoom: 1 }, geometry, 400, 250,
  );
  camera.pinchBy(1.5, { x: 400, y: 250 }, { x: 460, y: 290 });

  const view = camera.getView();
  expect(view.zoom).toBeCloseTo(1.5);
  expect(worldAt(view, geometry, 460, 290).x).toBeCloseTo(worldX);
  expect(worldAt(view, geometry, 460, 290).y).toBeCloseTo(worldY);

  camera.pinchBy(1, { x: 460, y: 290 }, { x: 500, y: 330 });
  const moved = camera.getView();
  expect(moved.scrollX).toBeCloseTo(view.scrollX - 40 / view.zoom);
  expect(moved.scrollY).toBeCloseTo(view.scrollY - 40 / view.zoom);
});


it("matches Phaser's true visible-world edges for pan at every zoom", () => {
  // Actual 80x60-cell site at 32x24 px, plus a portrait/mobile viewport.
  for (const g of [
    { worldWidth: 80 * 32, worldHeight: 60 * 24, viewportWidth: 1280, viewportHeight: 720 },
    { worldWidth: 80 * 32, worldHeight: 60 * 24, viewportWidth: 390, viewportHeight: 844 },
    { worldWidth: 30 * 32, worldHeight: 18 * 24, viewportWidth: 1400, viewportHeight: 900 },
  ]) {
    const limits = cameraZoomLimits(g, Math.min(g.viewportWidth / 1152, g.viewportHeight / 648));
    const camera = new CameraNavigation(
      g,
      { scrollX: 0, scrollY: 0, zoom: 1 },
      { motion: "instant", ...limits },
    );
    for (const factor of [0.001, 1.5, 3, 0.3, 999]) {
      camera.zoomAt(factor, g.viewportWidth * 0.17, g.viewportHeight * 0.83);
      expectInsideMap(camera.getView(), g);
      camera.panByWorld(-999_999, -999_999);
      expectInsideMap(camera.getView(), g);
      let b = visibleWorld(camera.getView(), g);
      close(b.left, 0, 5);
      close(b.top, 0, 5);
      camera.panByWorld(999_999, 999_999);
      expectInsideMap(camera.getView(), g);
      b = visibleWorld(camera.getView(), g);
      close(b.right, g.worldWidth, 5);
      close(b.bottom, g.worldHeight, 5);
    }
  }
});

it("derives the zoom floor from map and viewport, never from fixed scroll limits", () => {
  const g = {
    worldWidth: 80 * 32, worldHeight: 60 * 24,
    viewportWidth: 1280, viewportHeight: 720,
  };
  const limits = cameraZoomLimits(g, 1);
  close(limits.minZoom, 0.65); // comfort floor > map coverage floor
  expect(limits.maxZoom).toBeGreaterThan(limits.minZoom);

  const portrait = { ...g, viewportWidth: 390, viewportHeight: 844 };
  close(cameraZoomLimits(portrait, 0.3).minZoom, 844 / 1440);

  const tiny = { ...g, worldWidth: 200, worldHeight: 100 };
  const adaptive = cameraZoomLimits(tiny, 0.7);
  close(adaptive.minZoom, 7.2);
  expect(adaptive.maxZoom).toBeGreaterThan(adaptive.minZoom);

  const camera = new CameraNavigation(g, initial, { motion: "instant", ...limits });
  camera.zoomAt(0.00001, 0, 0);
  close(camera.getView().zoom, limits.minZoom);
  expectInsideMap(camera.getView(), g);
  camera.resize(1920, 1080);
  const wide = { ...g, viewportWidth: 1920, viewportHeight: 1080 };
  camera.setZoomLimits(
    cameraZoomLimits(wide, 1.5).minZoom,
    cameraZoomLimits(wide, 1.5).maxZoom,
  );
  expectInsideMap(camera.getView(), wide);

  // Geometry can change with a new generated map; clamps must follow it.
  camera.setWorldSize(1200, 900);
  const changed = { ...wide, worldWidth: 1200, worldHeight: 900 };
  const next = cameraZoomLimits(changed, 1.5);
  camera.setZoomLimits(next.minZoom, next.maxZoom);
  expectInsideMap(camera.getView(), changed);
  camera.panByWorld(999999, 999999);
  expectInsideMap(camera.getView(), changed);
});

it("centers independently of zoom and grab-pans without a delayed catch-up", () => {
  const camera = new CameraNavigation(
    geometry, initial, { halfLifeMs: 180 },
  );
  camera.centerOn(3000, 2500, 2);
  expect(camera.getTarget()).toEqual({
    zoom: 2,
    scrollX: 3000 - geometry.viewportWidth / 2,
    scrollY: 2500 - geometry.viewportHeight / 2,
  });
  camera.advance(60);
  const before = camera.getView();
  camera.panByScreen(90, -40);
  const grabbed = camera.getView();
  close(grabbed.scrollX - before.scrollX, -90 / before.zoom);
  close(grabbed.scrollY - before.scrollY, 40 / before.zoom);
  const settled = camera.advance(10000);
  close(settled.scrollX, grabbed.scrollX);
  close(settled.scrollY, grabbed.scrollY);
  for (let n = 0; n < 10; n++) {
    close(camera.advance(16).scrollX, grabbed.scrollX);
  }
});
