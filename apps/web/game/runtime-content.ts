import { parseStudioBundle, type StudioBundle } from "@site/content/bundle";

export const RUNTIME_PACK_STORAGE_KEY = "unknown-yield-active-pack-v1";
export const MAX_RUNTIME_PACK_BYTES = 2 * 1024 * 1024;

export type RuntimePack = {
  fingerprint: string;
  bundle: StudioBundle;
};

type Reader = { getItem(key: string): string | null };
type Writer = { setItem(key: string, value: string): void };
type Remover = { removeItem(key: string): void };

function sizeCheck(raw: string): void {
  if (new TextEncoder().encode(raw).byteLength > MAX_RUNTIME_PACK_BYTES)
    throw new Error("Content pack is larger than the 2 MiB import limit");
}

/**
 * SHA-256 binds locale and ALL content fields, including undiscovered reaction
 * truth, to the precise authoring version used by this expedition.
 */
async function digest(bundle: StudioBundle): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle)
    throw new Error("Secure browser context required to verify content packs");
  const bytes = new TextEncoder().encode(JSON.stringify(bundle));
  const data = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(data), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function parseRuntimePack(input: string): Promise<RuntimePack> {
  sizeCheck(input);
  // parseStudioBundle is the SAME gameplay/locale/reference validator used by
  // Studio export, split from TinyBase to keep production player JS lean.
  const bundle = parseStudioBundle(input);
  return { bundle, fingerprint: await digest(bundle) };
}

export function saveRuntimePack(storage: Writer, pack: RuntimePack): void {
  const value = JSON.stringify(pack);
  sizeCheck(value);
  storage.setItem(RUNTIME_PACK_STORAGE_KEY, value);
}

export async function loadRuntimePack(storage: Reader): Promise<RuntimePack | null> {
  const raw = storage.getItem(RUNTIME_PACK_STORAGE_KEY);
  if (raw === null) return null;
  sizeCheck(raw);
  let stored: unknown;
  try {
    stored = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Stored content pack is not valid JSON");
  }
  if (!stored || typeof stored !== "object" || Array.isArray(stored))
    throw new Error("Stored content pack has invalid metadata");
  const record = stored as Record<string, unknown>;
  if (typeof record.fingerprint !== "string" ||
      !/^[a-f0-9]{64}$/.test(record.fingerprint) ||
      !record.bundle)
    throw new Error("Stored content pack is missing its SHA-256 identity");
  const parsed = await parseRuntimePack(JSON.stringify(record.bundle));
  if (parsed.fingerprint !== record.fingerprint)
    throw new Error("Stored content pack fingerprint mismatch");
  return parsed;
}

export function clearRuntimePack(storage: Remover): void {
  storage.removeItem(RUNTIME_PACK_STORAGE_KEY);
}
