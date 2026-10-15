import { afterEach, describe, expect, it, vi } from "vitest";
import { IndustrialFeedbackAudio } from "../game/audio-feedback";

class FakeGain {
  gain = {
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
  connect(destination: unknown) { return destination; }
}
class FakeOscillator {
  type: OscillatorType = "sine";
  frequency = { setValueAtTime: vi.fn() };
  started = 0;
  stopped = 0;
  connect(gain: FakeGain) { return gain; }
  start() { this.started++; }
  stop() { this.stopped++; }
}
class FakeAudioContext {
  static last: FakeAudioContext;
  state = "running";
  currentTime = 1;
  destination = {};
  oscillators: FakeOscillator[] = [];
  closed = false;
  constructor() { FakeAudioContext.last = this; }
  createOscillator() {
    const node = new FakeOscillator();
    this.oscillators.push(node);
    return node;
  }
  createGain() { return new FakeGain(); }
  close() { this.closed = true; return Promise.resolve(); }
  resume() { this.state = "running"; return Promise.resolve(); }
}
const targets = (count: number) => Array.from({ length: count }, (_, i) => ({
  id: "machine-" + i,
  kind: "diesel-drive" as const,
  volume: 0.008,
}));

afterEach(() => vi.unstubAllGlobals());

describe("P0 WebAudio operating voice lifecycle", () => {
  it("never starts before a user gesture enables audio", () => {
    vi.stubGlobal("window", { AudioContext: FakeAudioContext });
    const audio = new IndustrialFeedbackAudio();
    audio.syncLoops(targets(5), true);
    expect(FakeAudioContext.last).toBeUndefined();
    audio.destroy();
  });

  it("reuses voices and stops all on mute or destruction", async () => {
    vi.stubGlobal("window", { AudioContext: FakeAudioContext });
    const audio = new IndustrialFeedbackAudio();
    await audio.enable();
    const context = FakeAudioContext.last;
    audio.syncLoops(targets(12), true);
    expect(context.oscillators).toHaveLength(3);
    expect(context.oscillators.every((node) => node.started === 1)).toBe(true);

    audio.syncLoops(targets(12), true);
    expect(context.oscillators).toHaveLength(3);

    audio.syncLoops([{ id: "new", kind: "rotary-drive", volume: 0.005 }], true);
    expect(context.oscillators).toHaveLength(4);
    expect(context.oscillators.slice(0, 3).every((node) => node.stopped === 1)).toBe(true);

    audio.syncLoops(targets(5), false);
    expect(context.oscillators[3]!.stopped).toBe(1);
    audio.destroy();
    expect(context.closed).toBe(true);
    audio.destroy();
  });
});
