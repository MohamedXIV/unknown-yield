import { fixture } from "@site/content";
import type { RuntimePack } from "./runtime-content";
import { finishBrowserMetric, startBrowserMetric } from "./performance";
import {
  Simulation,
  type GameCommand,
  type CommandResult,
} from "@site/sim-core";
import {
  createExpedition, deleteExpedition, listExpeditions, readLegacyRecord,
  recoverArchiveIndex,
  renameExpedition, saveExpedition, slotRevisions,
  type ArchiveStorage, type ArchiveListing,
} from "./save-archive";
export class Session {
  private sim = new Simulation(fixture);
  private pack: RuntimePack | null = null;
  private slotId: string | null = null;
  private last: number | null = null;
  private revision = 0;
  private savedRevision = 0;
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
    if (result.ok) this.revision += 1;
    this.notify();
    return result;
  };
  hasUnsavedChanges() {
    return this.slotId === null || this.revision !== this.savedRevision;
  }
  /** Only exact-pack slots with at least one fully valid Simulation snapshot are loadable. */
  loadableSlotIds(storage: ArchiveStorage): string[] {
    const fingerprint = this.activePackFingerprint();
    return this.list(storage).slots.flatMap((slot) => {
      if (slot.fingerprint !== fingerprint) return [];
      const valid = slotRevisions(storage, slot.id, fingerprint).some((candidate) => {
        const checked = new Simulation(this.pack?.bundle.content ?? fixture);
        return checked.load(candidate.save).ok;
      });
      return valid ? [slot.id] : [];
    });
  }
  mostRecentValidSlotId(storage: ArchiveStorage): string | null {
    const valid = new Set(this.loadableSlotIds(storage));
    return this.list(storage).slots.find((slot) => valid.has(slot.id))?.id ?? null;
  }
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
      const elapsed = Math.max(0, Math.min(250, now - this.last));
      this.sim.step(elapsed);
      if (elapsed > 0) this.revision += 1;
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
    this.slotId = null;
    this.last = null;
    this.revision = 0;
    this.savedRevision = 0;
    this.notify();
  }
  activePackFingerprint() {
    return this.pack?.fingerprint ?? null;
  }
  activeSlotId() {
    return this.slotId;
  }
  list(storage: ArchiveStorage): ArchiveListing {
    return listExpeditions(storage, this.activePackFingerprint());
  }
  recoverArchive(storage: ArchiveStorage): CommandResult {
    try {
      const count = recoverArchiveIndex(storage);
      return {
        ok: true,
        message: "Archive index recovered from prior backup (" + count +
          " expeditions). A damaged-index copy was preserved. Review saved slots before continuing.",
      };
    } catch (error) {
      return { ok: false, message: "Archive repair refused. No existing data changed. " + String(error) };
    }
  }
  reset() {
    this.sim = new Simulation(this.pack?.bundle.content ?? fixture);
    this.slotId = null;
    this.last = null;
    this.notify();
  }
  /** Create and persist a NEW world before replacing the running world. */
  createSlot(storage: ArchiveStorage, name: string): CommandResult {
    try {
      const next = new Simulation(this.pack?.bundle.content ?? fixture);
      const slot = createExpedition(storage, name, this.activePackFingerprint(), next.serialize());
      this.sim = next;
      this.slotId = slot.id;
      this.last = null;
      this.revision = 0;
      this.savedRevision = 0;
      this.notify();
      return { ok: true, message: "New expedition recorded: " + slot.name };
    } catch (error) {
      return { ok: false, message: "New expedition not created. Current world unchanged. " + String(error) };
    }
  }
  /** Load by ID, never by name, content-pack prefix or array index. */
  loadSlot(storage: ArchiveStorage, slotId: string): CommandResult {
    try {
      const candidates = slotRevisions(storage, slotId, this.activePackFingerprint());
      let reason = "No readable copies remain.";
      for (const candidate of candidates) {
        const next = new Simulation(this.pack?.bundle.content ?? fixture);
        const checked = next.load(candidate.save);
        if (!checked.ok) {
          reason = checked.message;
          continue;
        }
        this.sim = next;
        this.slotId = slotId;
        this.last = null;
        this.revision = 0;
        this.savedRevision = 0;
        this.notify();
        return {
          ok: true,
          message: candidate.backup
            ? "Previous valid expedition revision recovered. Save again to preserve it."
            : "Expedition restored",
        };
      }
      return { ok: false, message: "Expedition not loaded. Current world unchanged. " + reason };
    } catch (error) {
      return { ok: false, message: "Expedition not loaded. Current world unchanged. " + String(error) };
    }
  }
  /** Legacy keys are never rewritten or deleted by adoption. */
  importLegacy(storage: ArchiveStorage, key: string, name: string): CommandResult {
    try {
      const saved = readLegacyRecord(storage, key, this.activePackFingerprint());
      const next = new Simulation(this.pack?.bundle.content ?? fixture);
      const checked = next.load(saved);
      if (!checked.ok) return checked;
      const slot = createExpedition(
        storage, name, this.activePackFingerprint(), next.serialize(), key,
      );
      this.sim = next;
      this.slotId = slot.id;
      this.last = null;
      this.notify();
      return { ok: true, message: "Legacy record imported without altering the original." };
    } catch (error) {
      return { ok: false, message: "Legacy import failed; original and current world unchanged. " + String(error) };
    }
  }
  save(storage: ArchiveStorage): CommandResult {
    if (!this.slotId)
      return { ok: false, message: "Create a named expedition before saving. Old field records remain safe." };
    try {
      saveExpedition(storage, this.slotId, this.activePackFingerprint(), this.sim.serialize());
      this.savedRevision = this.revision;
      return { ok: true, message: "Expedition saved locally on this device" };
    } catch (error) {
      return { ok: false, message: "Save failed; prior expedition record is intact. " + String(error) };
    }
  }
  restore(storage: ArchiveStorage): CommandResult {
    if (!this.slotId)
      return { ok: false, message: "Choose a saved expedition from Personnel Archives." };
    return this.loadSlot(storage, this.slotId);
  }
  renameSlot(storage: ArchiveStorage, slotId: string, name: string): CommandResult {
    try {
      renameExpedition(storage, slotId, name);
      return { ok: true, message: "Expedition renamed" };
    } catch (error) {
      return { ok: false, message: "Rename failed; archive unchanged. " + String(error) };
    }
  }
  deleteSlot(storage: ArchiveStorage, slotId: string): CommandResult {
    try {
      deleteExpedition(storage, slotId);
      if (this.slotId === slotId) this.slotId = null;
      return {
        ok: true,
        message: "Expedition deleted. The running world remains in memory but is not saved.",
      };
    } catch (error) {
      return { ok: false, message: "Could not fully delete expedition: " + String(error) };
    }
  }
}
