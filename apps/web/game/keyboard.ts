/**
 * Layout-independent shortcut key.
 *
 * Shortcuts were matched on `event.key`, which is the character the active layout
 * produces. On an Arabic (or Cyrillic, Greek, ...) layout that is not a Latin
 * letter, so R, F, X, WASD and sometimes the digit row stopped working. Latin
 * layouts keep their current behaviour (the printed key wins, so AZERTY and
 * Dvorak users still press the letter they see); only a non-Latin character falls
 * back to the physical key position.
 */
export function shortcutKey(event: Pick<KeyboardEvent, "key" | "code">): string {
  const key = event.key.toLowerCase();
  if (/^[a-z0-9]$/.test(key) || key.length > 1 || key === " ") return key;
  const letter = /^Key([A-Z])$/.exec(event.code);
  if (letter) return letter[1].toLowerCase();
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(event.code);
  if (digit) return digit[1];
  return key;
}

type FocusLike = {
  matches(selector: string): boolean;
  closest(selector: string): unknown;
  isContentEditable?: boolean;
};

/**
 * Does the focused element own this key instead of the world?
 *
 * Text entry and open dialogs always own the keyboard. A focused button or link owns only
 * Space and Enter (its own activation). Everything else (Esc, R, F, WASD, arrows, digits)
 * must still reach the world: after the player clicks a build button the button keeps focus,
 * and treating that as "editing" made Esc and R do nothing until the player clicked the
 * on-screen button again.
 */
export function focusOwnsKey(element: FocusLike | null, key: string | null = null): boolean {
  if (!element) return false;
  if (element.matches("input,textarea,select") || element.isContentEditable) return true;
  if (element.closest('[role="dialog"],[aria-modal="true"]')) return true;
  if (key === " " || key === "enter") return element.matches("button,a[href],[role=button],[role=menuitem]");
  return false;
}
