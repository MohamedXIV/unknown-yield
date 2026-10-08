import { fixture } from "@site/content";
import type { RuntimePack } from "./runtime-content";
import { finishBrowserMetric, startBrowserMetric } from "./performance";
import {
  Simulation,
  type GameCommand,
  type CommandResult,
} from "@site/sim-core";
const SAVE_KEY = "industrial-site-save-v15";
type StorageReader = { getItem(key: string): string | null };
type StorageWriter = { setItem(key: string, value: string): void };
export class Session {
  private sim = new Simulation(fixture);
  private pack: RuntimePack | null = null;
  private last: number | null = null;
  private listeners = new Set<() => void>();
  // Both React and Phaser consume the same read-only projection per update.
  // Do not run Simulation.snapshot() and its structuredClone twice for one tick.
  private cachedSnapshot: ReturnType<Simulation["snapshot"]> | null = null;
  snapshot = () => {
    if (this.cachedSnapshot) return this.cachedSnapshot;
    const startedAt = startBrowserMetric();
    this.cachedSnapshot = this.sim.snapshot();
    finishBrowserMetric("snapshot", startedAt);
    return this.cachedSnapshot;
  };
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private notify() {
    // Invalidate BEFORE either subscriber reads so all consumers see
    // the same fresh, completed simulation state.
    this.cachedSnapshot = null;
    for (const fn of this.listeners) fn();
  }
  command = (cmd: GameCommand) => {
    const result = this.sim.command(cmd);
    this.notify();
    return result;
  };
  preview = (cmd: GameCommand) => this.sim.preview(cmd);
  suspend() {
    this.last = null;
  }
  advance(now: number, hidden: boolean) {
    if (hidden) {
      this.last = null;
      return;
    }
    if (this.last !== null) {
      const startedAt = startBrowserMetric();
      this.sim.step(Math.max(0, Math.min(250, now - this.last)));
      finishBrowserMetric("simulation-step", startedAt);
      this.notify();
    }
    this.last = now;
  }
  /** Explicit new expedition. Never hot-swap an already running world. */
  usePack(pack: RuntimePack | null) {
    // Build the replacement first: a failed constructor cannot damage the
    // running sim or the user's existing saves.
    const next = new Simulation(pack?.bundle.content ?? fixture);
    this.sim = next;
    this.pack = pack;
    this.last = null;
    this.notify();
  }
  activePackFingerprint() {
    return this.pack?.fingerprint ?? null;
  }
  reset() {
    this.sim = new Simulation(this.pack?.bundle.content ?? fixture);
    this.last = null;
    this.notify();
  }
  save(storage: StorageWriter): CommandResult {
    try {
      const save = this.sim.serialize();
      if (this.pack) {
        storage.setItem(
          SAVE_KEY + "-pack-" + this.pack.fingerprint,
          JSON.stringify({ fingerprint: this.pack.fingerprint, save }),
        );
      } else {
        storage.setItem(SAVE_KEY, JSON.stringify(save));
      }
      return { ok: true, message: "Field record saved on this device" };
    } catch {
      return {
        ok: false,
        message: "Storage unavailable. Your current session is still running.",
      };
    }
  }
  restore(storage: StorageReader): CommandResult {
    try {
      if (this.pack) {
        const raw = storage.getItem(SAVE_KEY + "-pack-" + this.pack.fingerprint);
        if (!raw) return {
          ok: false, message: "No world saved for this exact content pack. Existing other worlds were not changed.",
        };
        const envelope = JSON.parse(raw) as { fingerprint?: unknown; save?: unknown };
        if (!envelope || envelope.fingerprint !== this.pack.fingerprint || !envelope.save)
          return { ok: false, message: "Saved world content identity mismatch. Current session unchanged." };
        const result = this.sim.load(envelope.save);
        if (result.ok) {
          this.last = null;
          this.notify();
        }
        return result;
      }
      // Older browser records remain readable for explicit compatibility diagnostics.
      const raw =
        storage.getItem(SAVE_KEY) ??
        storage.getItem("industrial-site-save-v14") ??
        storage.getItem("industrial-site-save-v13") ??
        storage.getItem("industrial-site-save-v12") ??
        storage.getItem("industrial-site-save-v11") ??
        storage.getItem("industrial-site-save-v10") ??
        storage.getItem("industrial-site-save-v9") ??
        storage.getItem("industrial-site-save-v8") ??
        storage.getItem("industrial-site-save-v7") ??
        storage.getItem("industrial-site-save-v6") ??
        storage.getItem("industrial-site-save-v5") ??
        storage.getItem("industrial-site-save-v4");
      if (!raw)
        return {
          ok: false,
          message:
            storage.getItem("industrial-site-save-v3") ||
            storage.getItem("industrial-site-save-v2") ||
            storage.getItem("industrial-site-save-v1")
              ? "This field record uses an older world format (schema 3 or earlier) and cannot be loaded. Start a new site."
              : "No world saved on this device",
        };
      const result = this.sim.load(JSON.parse(raw));
      if (result.ok) {
        this.last = null;
        this.notify();
      }
      return result;
    } catch {
      return {
        ok: false,
        message: "Could not read this field record. Current session unchanged.",
      };
    }
  }
}
