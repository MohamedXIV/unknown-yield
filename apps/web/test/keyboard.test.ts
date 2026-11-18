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
