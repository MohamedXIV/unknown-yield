import { describe, expect, it } from "vitest";
import { enCatalog, lintVoice } from "../src";

describe("who is speaking", () => {
  it("never leaves an anonymous company or corporation in the catalog", () => {
    expect(
      lintVoice(enCatalog)
        .filter((note) => note.rule === "company")
        .map((note) => note.key),
    ).toEqual([]);
  });

  it("calls the ordinary operating fuel state fuel everywhere it is named", () => {
    const naming = Object.entries(enCatalog).filter(([, text]) =>
      /\b(state|company) (fuel|allocation)\b/i.test(text),
    );
    expect(naming.length).toBeGreaterThan(0);
    for (const [key, text] of naming) {
      expect(text, key).not.toMatch(/company/i);
    }
  });
});
