import { describe, expect, it } from "vitest";
import { shortcutKey } from "../game/keyboard";

describe("shortcutKey", () => {
  it("keeps the printed Latin key, so AZERTY and Dvorak users are unchanged", () => {
    expect(shortcutKey({ key: "R", code: "KeyR" })).toBe("r");
    expect(shortcutKey({ key: "a", code: "KeyQ" })).toBe("a");
    expect(shortcutKey({ key: "1", code: "Digit1" })).toBe("1");
  });
  it("falls back to the physical key on a non-Latin layout", () => {
    expect(shortcutKey({ key: "ر", code: "KeyR" })).toBe("r");
    expect(shortcutKey({ key: "ب", code: "KeyF" })).toBe("f");
    expect(shortcutKey({ key: "١", code: "Digit1" })).toBe("1");
    expect(shortcutKey({ key: "ك", code: "KeyX" })).toBe("x");
  });
  it("passes named keys through", () => {
    expect(shortcutKey({ key: "Escape", code: "Escape" })).toBe("escape");
    expect(shortcutKey({ key: "Home", code: "Home" })).toBe("home");
    expect(shortcutKey({ key: " ", code: "Space" })).toBe(" ");
  });
});

import { focusOwnsKey } from "../game/keyboard";

const el = (over: { selectors?: string[]; dialog?: boolean; editable?: boolean }) => ({
  matches: (s: string) => (over.selectors ?? []).some((x) => s.split(",").includes(x)),
  closest: () => (over.dialog ? {} : null),
  isContentEditable: over.editable ?? false,
});

describe("focusOwnsKey", () => {
  it("lets Esc, R, WASD and arrows through a focused build button", () => {
    const button = el({ selectors: ["button"] });
    for (const key of ["escape", "r", "f", "w", "a", "s", "d", "arrowleft", "1"])
      expect(focusOwnsKey(button, key), key).toBe(false);
  });
  it("keeps Space and Enter for the focused button or link", () => {
    expect(focusOwnsKey(el({ selectors: ["button"] }), " ")).toBe(true);
    expect(focusOwnsKey(el({ selectors: ["a[href]"] }), "enter")).toBe(true);
  });
  it("always keeps text entry and open dialogs", () => {
    expect(focusOwnsKey(el({ selectors: ["input"] }), "escape")).toBe(true);
    expect(focusOwnsKey(el({ editable: true }), "r")).toBe(true);
    expect(focusOwnsKey(el({ selectors: ["button"], dialog: true }), "escape")).toBe(true);
  });
  it("owns nothing when nothing is focused", () => {
    expect(focusOwnsKey(null, "escape")).toBe(false);
  });
});
