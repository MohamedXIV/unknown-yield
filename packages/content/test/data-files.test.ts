import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { enCatalog, fixture } from "../src";
import { parseStudioBundle } from "../src/bundle";

const read = (name: string) =>
  JSON.parse(
    readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8"),
  ) as unknown;

describe("content data files", () => {
  it("are the source of the built-in fixture and English catalog", () => {
    const bundle = parseStudioBundle({
      schemaVersion: 1,
      content: read("content.json"),
      locale: read("locale.en.json"),
    });
    expect(bundle.content).toEqual(fixture);
    expect(bundle.locale).toEqual(enCatalog);
  });

  it("keep locale keys sorted so a Studio save never reorders them", () => {
    const keys = Object.keys(read("locale.en.json") as object);
    expect(keys).toEqual(
      [...keys].sort((a, b) => a.localeCompare(b)),
    );
  });
});
