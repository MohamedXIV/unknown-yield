import { describe, expect, it } from "vitest";
import { enCatalog, fixture } from "@site/content";
import { Simulation } from "@site/sim-core";
import {
  enqueueProclamations,
  proclamationsBetween,
  proclamationText,
  type Proclamation,
} from "../game/proclamations";

const lookup = {
  t: (key: string, params?: Record<string, string>) =>
    (enCatalog[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, n: string) => params?.[n] ?? ""),
  exists: (key: string) => key in enCatalog,
  toolName: (tool: string) => `Tool ${tool}`,
};
const extractor = { type: "placeMachine", definitionId: "extractor", x: 15, y: 25, direction: 0 };

describe("proclamations", () => {
  it("announces nothing when nothing changed", () => {
    const s = new Simulation(fixture, { guided: true });
    expect(proclamationsBetween(s.snapshot(), s.snapshot())).toEqual([]);
  });

  it("announces a permit once, with the tools it grants", () => {
    const s = new Simulation(fixture, { guided: true });
    const before = s.snapshot();
    s.command(extractor);
    const found = proclamationsBetween(before, s.snapshot());
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      id: "permit:premises",
      kind: "authorization",
      weight: "major",
      illustration: "premises",
      tools: ["factory", "port"],
    });
    expect(proclamationsBetween(s.snapshot(), s.snapshot())).toEqual([]);
  });

  it("says nothing about permits of an unguided world", () => {
    const s = new Simulation(fixture);
    const before = s.snapshot();
    s.command(extractor);
    expect(proclamationsBetween(before, s.snapshot())).toEqual([]);
  });

  it("uses authored wording for a permit and generic wording for the rest", () => {
    const permit = proclamationText(
      { id: "permit:premises", kind: "authorization", weight: "major", illustration: "premises" },
      lookup,
    );
    expect(permit.title).toBe("Walls are approved.");
    expect(permit.kicker).toBe("Order of the Directorate");
    const unlock = proclamationText(
      { id: "unlock:deep-extractor", kind: "unlock", weight: "major", illustration: "equipment", tools: ["deep-extractor"] },
      lookup,
    );
    expect(unlock.title).toBe("Tool deep-extractor is now issued");
    expect(unlock.body).not.toBe("");
  });

  it("ships authored wording for every permit in the content", () => {
    for (const permit of fixture.permits)
      for (const field of ["title", "body", "slogan"])
        expect(enCatalog[`proclamation.permit-${permit.id}.${field}`], permit.id + field).toBeTruthy();
  });

  it("queues without duplicates, majors first, and bounded", () => {
    const mk = (id: string, weight: Proclamation["weight"]): Proclamation => ({
      id,
      kind: "announcement",
      weight,
      illustration: "bulletin",
    });
    const queue = enqueueProclamations([mk("a", "minor")], [mk("a", "minor"), mk("b", "major")]);
    expect(queue.map((p) => p.id)).toEqual(["b", "a"]);
    const many = enqueueProclamations([], Array.from({ length: 20 }, (_, i) => mk("n" + i, "minor")), 5);
    expect(many).toHaveLength(5);
  });
});
