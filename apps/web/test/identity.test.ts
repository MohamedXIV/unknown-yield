import { describe, expect, it } from "vitest";
import { entityIdentity } from "../game/identity";

const catalog: Record<string, string> = {
  "machine.kiln.name": "Kiln",
  "machine.kiln.description": "Dries and fires raw material.",
  "machine.kiln.designation": "HW-4K",
  "machine.kiln.nickname": "Old Smoky",
  "machine.plain.name": "Plain machine",
};
const lookup = {
  t: (key: string) => catalog[key] ?? key,
  exists: (key: string) => key in catalog,
};

describe("entityIdentity", () => {
  it("returns every layer for built equipment", () => {
    expect(
      entityIdentity("machine", "kiln", "machine.kiln.name", lookup, {
        built: true,
      }),
    ).toEqual({
      name: "Kiln",
      description: "Dries and fires raw material.",
      designation: "HW-4K",
      nickname: "Old Smoky",
    });
  });

  it("withholds the nickname until the equipment is built", () => {
    const identity = entityIdentity(
      "machine",
      "kiln",
      "machine.kiln.name",
      lookup,
      { built: false },
    );
    expect(identity.nickname).toBeUndefined();
    expect(identity.designation).toBe("HW-4K");
  });

  it("omits missing layers instead of showing raw keys", () => {
    const identity = entityIdentity(
      "machine",
      "plain",
      "machine.plain.name",
      lookup,
      { built: true },
    );
    expect(identity).toEqual({ name: "Plain machine" });
    expect(JSON.stringify(identity)).not.toContain("machine.plain.");
  });
});
