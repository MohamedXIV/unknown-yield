import type { LocaleCatalog } from "./locale";

/**
 * Advisory checks for player-facing copy. Every rule is a heuristic that
 * points at wording worth a second look; none of them is an error and none
 * may block validation, export or import.
 */
export type VoiceRule =
  | "em-dash"
  | "contrast"
  | "company"
  | "stock-phrase"
  | "short-run"
  | "typed-number";

export type VoiceNote = {
  key: string;
  rule: VoiceRule;
  message: string;
  excerpt: string;
};

export const voiceRuleLabels: Record<VoiceRule, string> = {
  "em-dash": "Em dash in prose",
  contrast: "“X, not Y” contrast",
  company: "Who is “the company”?",
  "stock-phrase": "Stock phrase",
  "short-run": "Run of very short sentences",
  "typed-number": "Number typed into gameplay copy",
};

/** Namespaces whose copy quotes gameplay values that live in content data. */
const GAMEPLAY_NAMESPACES = [
  "order.",
  "directive.",
  "assistance.",
  "import.",
  "market.",
  "property.",
];

const STOCK_PHRASES = [
  "seamless",
  "seamlessly",
  "robust",
  "leverage",
  "leveraging",
  "delve",
  "tapestry",
  "testament",
  "elevate",
  "game-changer",
  "cutting-edge",
  "unlock the power",
];

const CONTRAST_PATTERNS = [
  /,\s+not\s/i,
  /\bnot just\b/i,
  /\b(?:isn't|aren't|is not|are not)\b[^.!?]{0,60}\b(?:it's|it is|they're|they are)\b/i,
];

const PLACEHOLDER = /\{\{[^}]*\}\}/g;

function excerpt(text: string, index: number): string {
  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + 48);
  return (
    (start > 0 ? "…" : "") +
    text.slice(start, end).trim() +
    (end < text.length ? "…" : "")
  );
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function wordCount(sentence: string): number {
  return sentence.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word))
    .length;
}

function lintEntry(key: string, raw: string): VoiceNote[] {
  const notes: VoiceNote[] = [];
  // Placeholders are interpolated values; their names must not trigger rules.
  // A leading dash is an attribution marker ("— Notice 41"), not prose.
  const text = raw.replace(PLACEHOLDER, "{}").replace(/^[—–]\s*/, "");
  const add = (rule: VoiceRule, message: string, at: number) =>
    notes.push({ key, rule, message, excerpt: excerpt(raw, Math.max(0, at)) });

  const dash = text.indexOf("—");
  if (dash >= 0)
    add("em-dash", "Prefer a full stop, comma or colon.", dash);

  for (const pattern of CONTRAST_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      add(
        "contrast",
        "State what it is instead of what it is not.",
        match.index,
      );
      break;
    }
  }

  const company = /\b(?:company|corporate)\b/i.exec(text);
  if (company)
    add(
      "company",
      "Name the speaker: the Directorate, the Institute, a Bureau, or the workshop.",
      company.index,
    );

  const lower = text.toLowerCase();
  for (const phrase of STOCK_PHRASES) {
    const match = new RegExp(
      `(?<![\\p{L}-])${phrase.replace(/[-\s]/g, "[-\\s]")}(?![\\p{L}-])`,
      "iu",
    ).exec(lower);
    if (match) {
      add("stock-phrase", "“" + phrase + "” reads as generic copy.", match.index);
      break;
    }
  }

  const parts = sentences(text);
  let run = 0;
  for (const part of parts) {
    run = wordCount(part) <= 4 ? run + 1 : 0;
    if (run === 3) {
      add(
        "short-run",
        "Three very short sentences in a row; join or vary them.",
        Math.max(0, text.indexOf(part) - 24),
      );
      break;
    }
  }

  if (GAMEPLAY_NAMESPACES.some((prefix) => key.startsWith(prefix))) {
    const digit = /\d/.exec(text);
    if (digit)
      add(
        "typed-number",
        "Use a {{placeholder}} so the figure follows the content data.",
        digit.index,
      );
  }

  return notes;
}

export function lintVoice(catalog: LocaleCatalog): VoiceNote[] {
  return Object.keys(catalog)
    .sort()
    .flatMap((key) => lintEntry(key, catalog[key]!));
}

export function summarizeVoice(
  notes: readonly VoiceNote[],
): Record<VoiceRule, number> {
  const counts = Object.fromEntries(
    (Object.keys(voiceRuleLabels) as VoiceRule[]).map((rule) => [rule, 0]),
  ) as Record<VoiceRule, number>;
  for (const note of notes) counts[note.rule] += 1;
  return counts;
}
