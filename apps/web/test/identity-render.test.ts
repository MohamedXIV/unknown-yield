import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EquipmentIdentity from "../components/EquipmentIdentity";
import { entityIdentity } from "../game/identity";
import { i18n, setRuntimeContentLocale, t } from "../game/i18n";

const lookup = { t: (key: string) => t(key), exists: (key: string) => i18n.exists(key) };

const render = () =>
  createElement(EquipmentIdentity, {
    identity: entityIdentity("machine", "extractor", "machine.extractor.name", lookup, { built: true }),
  });

describe("equipment identity in the real i18n runtime", () => {
  it("shows nickname, plate and description once a key is added to the catalog", () => {
    const before = renderToStaticMarkup(render());
    expect(before).not.toContain("identity-");

    i18n.addResources("en", "translation", {
      "machine.extractor.nickname": "The Biter",
      "machine.extractor.designation": "HW-1E",
      "machine.extractor.description": "Cuts ore from a surface deposit.",
    });
    try {
      const html = renderToStaticMarkup(render());
      expect(html).toContain("“The Biter”");
      expect(html).toContain("HW-1E");
      expect(html).toContain("Cuts ore from a surface deposit.");
      expect(html).not.toContain("machine.extractor.");
    } finally {
      setRuntimeContentLocale(null);
    }
  });
});
