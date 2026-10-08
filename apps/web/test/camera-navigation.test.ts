import { expect, it } from "vitest";
import { CameraNavigation } from "../game/camera-navigation";

const geometry = {
  worldWidth: 6000,
  worldHeight: 4800,
  viewportWidth: 1200,
  viewportHeight: 800,
};

const initial = { scrollX: 900, scrollY: 700, zoom: 1.1 };

const close = (actual: number, expected: number, precision = 6) =>
  expect(actual).toBeCloseTo(expected, precision);

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
  const worldX = initial.scrollX + x / initial.zoom;
  const worldY = initial.scrollY + y / initial.zoom;
  camera.zoomAt(1.5, x, y);

  for (const delta of [16, 25, 33, 50, 100, 200, 500, 5000]) {
    const view = camera.advance(delta);
    close(view.scrollX + x / view.zoom, worldX, 5);
    close(view.scrollY + y / view.zoom, worldY, 5);
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
  expect(camera.getView().scrollX).toBe(0);
  expect(camera.getView().scrollY).toBe(0);
  camera.zoomAt(100, 500, 300);
  expect(camera.getView().zoom).toBe(2.5);
  camera.panByWorld(100000, 100000);
  close(camera.getView().scrollX, 6000 - 1200 / 2.5);
  close(camera.getView().scrollY, 4800 - 800 / 2.5);

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
  close(camera.getView().scrollX, 100);
  close(camera.getView().scrollY, 175);
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
