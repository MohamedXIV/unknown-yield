import { fixture } from "@site/content";
import {
  Simulation,
  type GameCommand,
  type CommandResult,
} from "@site/sim-core";
const SAVE_KEY = "industrial-site-save-v2";
type StorageReader = { getItem(key: string): string | null };
type StorageWriter = { setItem(key: string, value: string): void };
export class Session {
  private sim = new Simulation(fixture);
  private last: number | null = null;
  private listeners = new Set<() => void>();
  snapshot = () => this.sim.snapshot();
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  private notify() {
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
      this.sim.step(Math.max(0, Math.min(250, now - this.last)));
      this.notify();
    }
    this.last = now;
  }
  reset() {
    this.sim = new Simulation(fixture);
    this.last = null;
    this.notify();
  }
  save(storage: StorageWriter): CommandResult {
    try {
      storage.setItem(SAVE_KEY, JSON.stringify(this.sim.serialize()));
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
      const raw = storage.getItem(SAVE_KEY);
      if (!raw)
        return {
          ok: false,
          message: storage.getItem("industrial-site-save-v1")
            ? "The old fixed-site save is incompatible with this world. Start a new site."
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
