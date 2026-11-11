import { describe, expect, it } from "vitest";
import { enCatalog, lintVoice, summarizeVoice } from "../src";

const rules = (catalog: Record<string, string>) =>
  lintVoice(catalog).map((note) => `${note.key}:${note.rule}`);

describe("voice lint", () => {
  it("flags em dashes and ignores plain punctuation", () => {
    expect(rules({ "ui.a.body": "Open it — then wait." })).toEqual([
      "ui.a.body:em-dash",
    ]);
    expect(rules({ "ui.a.body": "Open it, then wait." })).toEqual([]);
    expect(rules({ "ui.a.source": "— Appointment Notice 41/1" })).toEqual([]);
  });

  it("flags contrast framing", () => {
    expect(rules({ "ui.a.body": "A ledger, not a notebook." })).toEqual([
      "ui.a.body:contrast",
    ]);
    expect(rules({ "ui.a.body": "It isn't a bonus, it's a quota." })).toEqual([
      "ui.a.body:contrast",
    ]);
    expect(rules({ "ui.a.body": "Do not stack crates here." })).toEqual([]);
  });

  it("flags company and corporate but not words that merely contain them", () => {
    expect(rules({ "ui.a.body": "The company expects more." })).toEqual([
      "ui.a.body:company",
    ]);
    expect(rules({ "ui.a.body": "Accompanied by a clerk." })).toEqual([]);
  });

  it("flags stock phrases on word boundaries", () => {
    expect(rules({ "ui.a.body": "A robust process." })).toEqual([
      "ui.a.body:stock-phrase",
    ]);
    expect(rules({ "ui.a.body": "Seamless handover." })).toEqual([
      "ui.a.body:stock-phrase",
    ]);
    expect(rules({ "ui.a.body": "A robustly built crate." })).toEqual([]);
  });

  it("flags three very short sentences in a row only", () => {
    expect(rules({ "ui.a.body": "Stop. Look. Wait. Then go on." })).toEqual([
      "ui.a.body:short-run",
    ]);
    expect(
      rules({ "ui.a.body": "Stop. Look at the dial before you wait. Go." }),
    ).toEqual([]);
  });

  it("flags typed numbers only in gameplay namespaces and not placeholders", () => {
    expect(rules({ "order.a.body": "Deliver 40 units." })).toEqual([
      "order.a.body:typed-number",
    ]);
    expect(rules({ "order.a.body": "Deliver {{count}} units." })).toEqual([]);
    expect(rules({ "ui.a.body": "Deliver 40 units." })).toEqual([]);
  });

  it("does not let placeholder names trigger rules", () => {
    expect(
      rules({ "ui.a.body": "{{company}} wants {{leverage}} by {{seamless}}." }),
    ).toEqual([]);
  });

  it("returns stable, sorted, well-formed notes for the shipped catalog", () => {
    const notes = lintVoice(enCatalog);
    const keys = notes.map((note) => note.key);
    expect(keys).toEqual([...keys].sort());
    for (const note of notes) {
      expect(enCatalog[note.key]).toBeDefined();
      expect(note.message.length).toBeGreaterThan(0);
      expect(note.excerpt.length).toBeGreaterThan(0);
    }
    const summary = summarizeVoice(notes);
    expect(Object.values(summary).reduce((a, b) => a + b, 0)).toBe(
      notes.length,
    );
  });
});
