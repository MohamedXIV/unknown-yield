import { describe, expect, it } from "vitest";
import { enCatalog, fixture, identityKey, orphanIdentityKeys } from "../src";

describe("equipment identity keys", () => {
  it("builds keys as kind.id.field", () => {
    expect(identityKey("machine", "deep-extractor", "nickname")).toBe(
      "machine.deep-extractor.nickname",
    );
  });

  it("flags identity keys for entities that do not exist, and only those", () => {
    const machine = fixture.machines[0]!.id;
    const storage = fixture.storages[0]!.id;
    const catalog = {
      ...enCatalog,
      [`machine.${machine}.nickname`]: "Old Faithful",
      [`storage.${storage}.description`]: "Holds things.",
      "machine.no-such-machine.nickname": "Ghost",
      "storage.gone.designation": "ST-0",
      // Not an identity field: ordinary content keys are never reported.
      "machine.no-such-machine.name": "Not checked",
    };
    expect(orphanIdentityKeys(fixture, catalog)).toEqual([
      "machine.no-such-machine.nickname",
      "storage.gone.designation",
    ]);
  });

  it("finds no orphans in the shipped catalog", () => {
    expect(orphanIdentityKeys(fixture, enCatalog)).toEqual([]);
  });
});
