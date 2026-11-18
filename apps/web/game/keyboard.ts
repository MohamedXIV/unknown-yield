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
