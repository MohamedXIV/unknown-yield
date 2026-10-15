import type { FeedbackEvent, FeedbackKind } from "./feedback";
import type { MachineAudioCue, MachineOperatingLoop } from "@site/content";
import type { MachineLoopTarget } from "./machine-audio-planning";

type AudioContextWithWebkit = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export class IndustrialFeedbackAudio {
  private context: AudioContext | null = null;
  private lastConstructionAt = -Infinity;
  private readonly loops = new Map<string, {
    kind: MachineOperatingLoop;
    oscillator: OscillatorNode;
    gain: GainNode;
  }>();
  private destroyed = false;

  async enable(): Promise<void> {
    if (this.destroyed || typeof window === "undefined") return;
    if (!this.context) {
      const Constructor =
        window.AudioContext ??
        (window as AudioContextWithWebkit).webkitAudioContext;
      if (!Constructor) return;
      this.context = new Constructor();
    }
    if (this.context.state === "suspended") await this.context.resume();
  }

  play(events: readonly FeedbackEvent[], enabled = true): void {
    if (!enabled || !this.context || this.context.state !== "running") return;
    for (const event of events) {
      if (event.kind === "placement-light" || event.kind === "placement-heavy") {
        // Coalesce rapid drag gestures and button-repeat commands into one
        // quiet construction confirmation, not N oscillators per cell.
        const now = this.context.currentTime;
        if (now - this.lastConstructionAt < 0.11) continue;
        this.lastConstructionAt = now;
      }
      this.playKind(event.audioCue ?? event.kind);
    }
  }

  /** Keep at most the director's bounded, audible machine set alive. */
  syncLoops(targets: readonly MachineLoopTarget[], enabled: boolean): void {
    const context = this.context;
    if (this.destroyed || !enabled || !context || context.state !== "running") {
      this.stopLoops();
      return;
    }
    const next = new Map(targets.slice(0, 3).map((target) => [target.id, target]));
    for (const [id, voice] of this.loops) {
      const target = next.get(id);
      if (!target || target.kind !== voice.kind) this.stopLoop(id);
    }
    for (const target of next.values()) {
      let voice = this.loops.get(target.id);
      if (!voice) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = target.kind === "diesel-drive" ? "triangle" : "sawtooth";
        oscillator.frequency.setValueAtTime(
          target.kind === "diesel-drive" ? 65 : 92,
          context.currentTime,
        );
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        voice = { oscillator, gain, kind: target.kind };
        this.loops.set(target.id, voice);
      }
      // AudioParam scheduling does not create per-frame React state or timers.
      voice.gain.gain.setTargetAtTime(target.volume, context.currentTime, 0.07);
    }
  }

  private stopLoop(id: string): void {
    const voice = this.loops.get(id);
    if (!voice) return;
    this.loops.delete(id);
    const now = this.context?.currentTime ?? 0;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0.0001, now, 0.015);
    // Release every oscillator explicitly; no hidden audio lives after pause.
    voice.oscillator.stop(now + 0.1);
  }

  stopLoops(): void {
    for (const id of [...this.loops.keys()]) this.stopLoop(id);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopLoops();
    void this.context?.close();
    this.context = null;
  }

  private tone(
    frequency: number,
    duration: number,
    gainValue: number,
    type: OscillatorType = "sine",
    delay = 0,
  ): void {
    const context = this.context;
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }

  private noise(duration: number, gainValue: number): void {
    const context = this.context;
    if (!context) return;
    const frames = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let seed = 0x45d9f3b;
    for (let i = 0; i < frames; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      channel[i] = (seed / 4294967296) * 2 - 1;
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.setValueAtTime(gainValue, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + duration,
    );
    source.buffer = buffer;
    source.connect(gain).connect(context.destination);
    source.start();
  }

  private playKind(kind: FeedbackKind | MachineAudioCue): void {
    switch (kind) {
      case "placement-light":
        this.tone(255, 0.035, 0.017, "triangle");
        break;
      case "placement-heavy":
        this.tone(105, 0.095, 0.035, "triangle");
        this.tone(174, 0.055, 0.018, "sine", 0.025);
        break;
      case "machine-heavy-start":
        this.tone(73, 0.16, 0.035, "sawtooth");
        this.tone(115, 0.12, 0.025, "triangle", 0.045);
        break;
      case "machine-start":
        this.tone(118, 0.09, 0.045, "square");
        this.tone(82, 0.13, 0.028, "sine", 0.025);
        break;
      case "logistics-flow":
        this.tone(310, 0.035, 0.025, "triangle");
        this.tone(390, 0.025, 0.018, "triangle", 0.04);
        break;
      case "discovery":
        this.tone(440, 0.11, 0.035, "sine");
        this.tone(660, 0.16, 0.032, "sine", 0.09);
        break;
      case "warning":
        this.tone(250, 0.1, 0.04, "square");
        this.tone(210, 0.12, 0.035, "square", 0.12);
        break;
      case "hazard":
        this.noise(0.18, 0.055);
        this.tone(72, 0.28, 0.05, "sawtooth");
        break;
    }
  }
}
