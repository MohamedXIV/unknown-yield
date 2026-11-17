/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { fixture, validateContent } from "@site/content";
import contentData from "../../content/data/content.json";
import { Simulation } from "../src/index";
import { refreshPermits } from "../src/permits";

const guidedWorld = () => new Simulation(fixture, { guided: true });
const extractor = { type: "placeMachine", definitionId: "extractor", x: 15, y: 25, direction: 0 };
const shell = { type: "placeFactory", x: 24, y: 24, width: 6, height: 6 };
const crusher = { type: "placeMachine", definitionId: "crusher", x: 25, y: 25, direction: 0 };

describe("Directorate permits", () => {
  it("leaves an ordinary world fully open", () => {
    const s = new Simulation(fixture);
    expect(s.snapshot().unauthorizedTools).toEqual([]);
    expect(s.command(shell).ok).toBe(true);
  });

  it("starts a guided world with only the first tools", () => {
    const s = guidedWorld();
    expect(s.command(shell)).toMatchObject({ ok: false, message: "Not authorized yet" });
    expect(s.command(crusher).ok).toBe(false);
    expect(s.preview(shell).ok).toBe(false);
    expect(s.command({ type: "placePipes", points: [{ x: 1, y: 1 }], direction: 0 }).ok).toBe(false);
    expect(s.snapshot().unauthorizedTools).toEqual(expect.arrayContaining(["factory", "port", "crusher", "furnace", "depot", "pipe"]));
    expect(s.command(extractor)).toMatchObject({ ok: true });
  });

  it("authorizes the factory after an extractor, then the crusher after a factory", () => {
    const s = guidedWorld();
    s.command(extractor);
    expect(s.snapshot().unauthorizedTools).not.toContain("factory");
    expect(s.snapshot().unauthorizedTools).toContain("crusher");
    expect(s.command(crusher).ok).toBe(false);
    expect(s.command(shell).ok).toBe(true);
    expect(s.snapshot().unauthorizedTools).not.toContain("crusher");
    expect(s.command(crusher).ok).toBe(true);
    expect(s.snapshot().unauthorizedTools).toContain("tank");
  });

  it("keeps a permit after the machine that earned it is removed", () => {
    const s = guidedWorld();
    const id = s.command(extractor).id!;
    expect(s.command({ type: "dismantle", id }).ok).toBe(true);
    expect(s.snapshot().unauthorizedTools).not.toContain("factory");
  });

  it("earns the expansion permit from the first export", () => {
    const state = { permits: ["premises", "reduction"], machines: {}, factories: {}, exported: 1 };
    expect(refreshPermits(fixture, state as never)).toEqual(["expansion"]);
  });

  it("persists permits through a save and keeps old saves open", () => {
    const s = guidedWorld();
    s.command(extractor);
    const saved = s.serialize();
    expect(saved.permits).toEqual(["premises"]);
    const restored = new Simulation(fixture);
    expect(restored.load(saved).ok).toBe(true);
    expect(restored.command(shell).ok).toBe(true);
    const old = new Simulation(fixture).serialize();
    expect("permits" in old).toBe(false);
    const matured = guidedWorld();
    expect(matured.load(old).ok).toBe(true);
    expect(matured.snapshot().unauthorizedTools).toEqual([]);
  });

  it("rejects a save that names an unknown permit", () => {
    const s = guidedWorld();
    const save = { ...s.serialize(), permits: ["no-such-permit"] };
    expect(new Simulation(fixture).load(save).ok).toBe(false);
  });

  it("refuses content whose permits cannot be earned", () => {
    const data = structuredClone(contentData) as Record<string, any>;
    data.permits[0].tools.push("extractor");
    expect(() => validateContent(data)).toThrow();
    const trap = structuredClone(contentData) as Record<string, any>;
    trap.permits[1].tools.push("factory");
    expect(() => validateContent(trap)).toThrow();
  });

  it("does not gate anything for content without permits", () => {
    const open = { ...fixture, permits: [] };
    const s = new Simulation(open, { guided: true });
    expect(s.snapshot().unauthorizedTools).toEqual([]);
    expect(s.command(shell).ok).toBe(true);
  });
});
