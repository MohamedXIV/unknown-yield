"use client";
import { useEffect, useRef, useState } from "react";
import type { Session } from "../game/session";
import type { WorldMode } from "../game/interaction";
import type { GamePreferences } from "../game/preferences";
import type { WorldControls, WorldActions } from "../game/world";
export default function GameHost({
  session,
  mode,
  actions,
  homeToken,
  preferences,
}: {
  session: Session;
  mode: WorldMode;
  actions: WorldActions;
  homeToken: number;
  preferences: GamePreferences;
}) {
  const element = useRef<HTMLDivElement>(null),
    controls = useRef<WorldControls | null>(null),
    latest = useRef({ mode, actions, preferences });
  const [error, setError] = useState("");
  useEffect(() => {
    latest.current = { mode, actions, preferences };
    controls.current?.setMode(mode);
    controls.current?.setPreferences(preferences);
  }, [mode, actions, preferences]);
  useEffect(() => {
    let cancelled = false,
      teardown: (() => void) | undefined;
    import("../game/world")
      .then(({ createWorld }) => {
        if (cancelled || !element.current) return;
        const callbacks: WorldActions = {
          select: (id) => latest.current.actions.select(id),
          command: (c) => latest.current.actions.command(c),
          preview: (c) => latest.current.actions.preview(c),
          mode: (t) => latest.current.actions.mode(t),
          rotate: () => latest.current.actions.rotate(),
          toggleFactory: (id) => latest.current.actions.toggleFactory(id),
        };
        const world = createWorld(
          element.current,
          session.snapshot(),
          callbacks,
          latest.current.mode,
          latest.current.preferences,
        );
        controls.current = world;
        // Opt-in read-only browser evidence for camera input acceptance.
        const probeWindow = window as Window & {
          __UNKNOWN_YIELD_CAMERA__?: () => ReturnType<WorldControls["getCameraView"]>;
          __UNKNOWN_YIELD_PROJECT_WORLD__?: (
            x: number,
            y: number,
          ) => ReturnType<WorldControls["projectWorldPoint"]>;
        };
        const cameraProbe = new URLSearchParams(window.location.search).get("perf") === "1";
        if (cameraProbe) {
          probeWindow.__UNKNOWN_YIELD_CAMERA__ = () =>
            controls.current?.getCameraView() ?? null;
          probeWindow.__UNKNOWN_YIELD_PROJECT_WORLD__ = (x, y) =>
            controls.current?.projectWorldPoint(x, y) ?? null;
        }
        const unsubscribe = session.subscribe(() =>
          world.setSnapshot(session.snapshot()),
        );
        teardown = () => {
          unsubscribe();
          if (cameraProbe) {
            delete probeWindow.__UNKNOWN_YIELD_CAMERA__;
            delete probeWindow.__UNKNOWN_YIELD_PROJECT_WORLD__;
          }
          controls.current = null;
          world.destroy();
        };
      })
      .catch(() => {
        if (!cancelled) setError("Renderer could not start. Reload to retry.");
      });
    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [session]);
  useEffect(() => {
    controls.current?.home();
  }, [homeToken]);
  return (
    <div
      ref={element}
      className="world-host"
      role="application"
      aria-label="Industrial world. Use build tools then click or drag on the ground. Arrow keys or WASD pan. R rotates. Escape cancels."
    >
      {error && <div className="render-error">{error}</div>}
    </div>
  );
}
