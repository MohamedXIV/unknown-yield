import type { Content } from "@site/content";
import type { Save } from "./types";

/**
 * Material ledger (Issues #3–#4).
 *
 * Every produced unit must remain accounted for until it is transformed by a
 * defined reaction, consumed by a defined sink, stored, or exported off-map.
 * The per-material invariant is:
 *
 *   deposits + stock + staging + machineInput + machineOutput + belts
 *     + storage + escrow + embodied
 *     + flows.exported + flows.discarded + flows.consumed
 *       = initial + flows.produced
 *
 * - `deposits`/`initial` derive from content + save; extraction needs no
 *   counter because `initial - remaining` always covers extracted units.
 * - `escrow` covers in-flight batches: an extractor job holds one unit of its
 *   deposit material; a processor job holds `inputAmount` of its reaction
 *   input. `consumed`/`produced` are recorded at batch completion, so
 *   buffer -> escrow at start is audit-neutral.
 * - `embodied` covers construction plates sunk into placed structures, so
 *   build pay / dismantle refund are audit-neutral with no counters.
 * - Extraction outputs are NOT recorded in `produced` (already sourced via
 *   deposits); only defined reaction outputs are.
 *
 * All accounting is aggregate per material: no per-unit objects are created.
 */
export type LedgerRow = {
  material: string;
  deposits: number;
  initial: number;
  stock: number;
  staging: number;
  machineInput: number;
  machineOutput: number;
  belts: number;
  storage: number;
  escrow: number;
  embodied: number;
  consumed: number;
  produced: number;
  exported: number;
  discarded: number;
  held: number;
  sources: number;
  delta: number;
};
export type LedgerSnapshot = { rows: LedgerRow[] };
export type LedgerReport = {
  ok: boolean;
  rows: LedgerRow[];
  mismatches: LedgerRow[];
};

function blank(material: string): LedgerRow {
  return {
    material,
    deposits: 0,
    initial: 0,
    stock: 0,
    staging: 0,
    machineInput: 0,
    machineOutput: 0,
    belts: 0,
    storage: 0,
    escrow: 0,
    embodied: 0,
    consumed: 0,
    produced: 0,
    exported: 0,
    discarded: 0,
    held: 0,
    sources: 0,
    delta: 0,
  };
}

export function collectLedger(c: Content, s: Save): LedgerSnapshot {
  const rows = new Map<string, LedgerRow>();
  const row = (id: string) => {
    let r = rows.get(id);
    if (!r) {
      r = blank(id);
      rows.set(id, r);
    }
    return r;
  };

  // Sources present at genesis: starter stock + authored deposit units.
  if (c.site.startStock > 0) row(c.site.buildMaterial).initial += c.site.startStock;
  for (const d of c.site.deposits) row(d.material).initial += d.units;

  // Remaining source material still in the ground.
  for (const [id, n] of Object.entries(s.deposits ?? {})) {
    const d = c.site.deposits.find((a) => a.id === id);
    if (d) row(d.material).deposits += n;
  }

  // Terminal/site holdings: construction reserve plus tracked staging.
  for (const [id, n] of Object.entries(s.stock ?? {})) row(id).stock += n;
  for (const [id, n] of Object.entries(s.staging ?? {})) row(id).staging += n;

  // Machine buffers.
  for (const m of Object.values(s.machines ?? {})) {
    for (const [id, n] of Object.entries(m.input ?? {})) row(id).machineInput += n;
    for (const [id, n] of Object.entries(m.output ?? {}))
      row(id).machineOutput += n;
  }

  // Belt/transit cargo.
  for (const b of Object.values(s.belts ?? {})) {
    if (b.cargo) row(b.cargo).belts += 1;
  }

  // Physical bulk storage contents.
  for (const t of Object.values(s.storages ?? {})) {
    for (const [id, n] of Object.entries(t.inventory ?? {}))
      row(id).storage += n;
  }

  // In-flight batches: reserved material not yet in any buffer.
  for (const m of Object.values(s.machines ?? {})) {
    if (!m.job) continue;
    if (m.job.reaction) {
      const r = c.reactions.find((a) => a.id === m.job!.reaction);
      if (r) row(r.input).escrow += r.inputAmount;
    } else if (m.depositId) {
      const d = c.site.deposits.find((a) => a.id === m.depositId);
      if (d) row(d.material).escrow += 1;
    }
  }

  // Construction plates sunk into placed structures.
  let embodied = 0;
  for (const m of Object.values(s.machines ?? {})) {
    const d = c.machines.find((a) => a.id === m.definitionId);
    if (d) embodied += d.cost;
  }
  for (const t of Object.values(s.storages ?? {})) {
    const d = c.storages.find((a) => a.id === t.definitionId);
    if (d) embodied += d.cost;
  }
  for (const f of Object.values(s.factories ?? {})) {
    embodied += f.width * f.height * c.site.factoryCellCost + f.ports.length * c.site.portCost;
  }
  embodied += Object.keys(s.belts ?? {}).length * c.site.beltCost;
  if (embodied > 0) row(c.site.buildMaterial).embodied += embodied;

  // Cumulative defined sinks and transformation outputs.
  for (const [id, n] of Object.entries(s.flows?.consumed ?? {}))
    row(id).consumed += n;
  for (const [id, n] of Object.entries(s.flows?.produced ?? {}))
    row(id).produced += n;
  for (const [id, n] of Object.entries(s.flows?.exported ?? {}))
    row(id).exported += n;
  for (const [id, n] of Object.entries(s.flows?.discarded ?? {}))
    row(id).discarded += n;

  const out = [...rows.values()].map((r) => {
    r.held =
      r.deposits +
      r.stock +
      r.staging +
      r.machineInput +
      r.machineOutput +
      r.belts +
      r.storage +
      r.escrow +
      r.embodied +
      r.exported +
      r.discarded +
      r.consumed;
    r.sources = r.initial + r.produced;
    r.delta = r.held - r.sources;
    return r;
  });
  out.sort((a, b) => (a.material < b.material ? -1 : 1));
  return { rows: out };
}

export function auditLedger(c: Content, s: Save): LedgerReport {
  const { rows } = collectLedger(c, s);
  const mismatches = rows.filter((r) => r.delta !== 0);
  return { ok: mismatches.length === 0, rows, mismatches };
}
