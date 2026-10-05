import type { Content } from "@site/content";
import type {
  MarketBulletinView,
  MarketListingView,
  MarketState,
  Save,
} from "./types";
import { terminalCapabilityUnlocked } from "./milestones";
import {
  recordNetExportRecovery,
  recordObligationRepayment,
} from "./assistance";

export const MARKET_BPS = 10000;

export function exchangeDefinition(c: Content, materialId: string) {
  return c.economy.exchange.find((listing) => listing.materialId === materialId);
}

export function companyKnowsMaterial(
  c: Content,
  s: Pick<Save, "knowledge">,
  materialId: string,
): boolean {
  const material = c.materials.find((entry) => entry.id === materialId);
  if (!material) return false;
  if (material.known) return true;
  return c.reactions.some(
    (reaction) =>
      s.knowledge.includes(reaction.id) &&
      (reaction.input === materialId || reaction.output === materialId),
  );
}

function baseMarketState(c: Content, materialId: string): MarketState | null {
  const definition = exchangeDefinition(c, materialId);
  return definition
    ? { demandBps: definition.baseDemandBps, saturationBps: 0 }
    : null;
}

export function ensureMarket(
  c: Content,
  s: Pick<Save, "knowledge" | "market">,
  materialId: string,
): MarketState | null {
  if (!companyKnowsMaterial(c, s, materialId)) return null;
  const base = baseMarketState(c, materialId);
  if (!base) return null;
  return (s.market[materialId] ??= base);
}

export function initializeKnownMarkets(
  c: Content,
  s: Pick<Save, "knowledge" | "market">,
): void {
  for (const listing of c.economy.exchange)
    ensureMarket(c, s, listing.materialId);
}

export function marketCompensation(
  c: Content,
  s: Pick<Save, "knowledge" | "market">,
  materialId: string,
): number {
  const definition = exchangeDefinition(c, materialId);
  if (!definition || !companyKnowsMaterial(c, s, materialId)) return 0;
  const state = s.market[materialId] ?? baseMarketState(c, materialId)!;
  const demandAdjusted = Math.max(
    definition.floorCompensation,
    Math.floor((definition.baseCompensation * state.demandBps) / MARKET_BPS),
  );
  const discountable = Math.max(
    0,
    demandAdjusted - definition.floorCompensation,
  );
  const saturationDiscount = Math.floor(
    (discountable * state.saturationBps) / MARKET_BPS,
  );
  return Math.max(
    definition.floorCompensation,
    demandAdjusted - saturationDiscount,
  );
}

export function recordMarketExport(
  c: Content,
  s: Pick<Save, "knowledge" | "market">,
  materialId: string,
  units: number,
): void {
  const definition = exchangeDefinition(c, materialId),
    state = ensureMarket(c, s, materialId);
  if (!definition || !state || units <= 0) return;
  state.saturationBps = Math.min(
    MARKET_BPS,
    state.saturationBps + units * definition.saturationPerUnitBps,
  );
}

export function applyExportCompensation(
  c: Content,
  s: Pick<Save, "knowledge" | "market" | "fuel" | "debt" | "company">,
  materialId: string,
  units: number,
) {
  const perUnit = marketCompensation(c, s, materialId);
  if (perUnit <= 0 || units <= 0)
    return { perUnit: 0, gross: 0, repaid: 0, net: 0 };
  const gross = perUnit * units,
    repaid = Math.min(gross, s.debt),
    net = gross - repaid;
  s.debt -= repaid;
  recordObligationRepayment(s, repaid);
  s.fuel += net;
  recordNetExportRecovery(c, s, net);
  recordMarketExport(c, s, materialId, units);
  return { perUnit, gross, repaid, net };
}

export function recoverMarkets(
  c: Content,
  s: Pick<Save, "knowledge" | "market">,
): void {
  for (const listing of c.economy.exchange) {
    const state = s.market[listing.materialId];
    if (!state || !companyKnowsMaterial(c, s, listing.materialId)) continue;
    state.saturationBps = Math.max(
      0,
      state.saturationBps - listing.recoveryPerMarketTickBps,
    );
    const demandStep = listing.demandRecoveryPerMarketTickBps;
    if (state.demandBps > listing.baseDemandBps)
      state.demandBps = Math.max(
        listing.baseDemandBps,
        state.demandBps - demandStep,
      );
    else if (state.demandBps < listing.baseDemandBps)
      state.demandBps = Math.min(
        listing.baseDemandBps,
        state.demandBps + demandStep,
      );
  }
}

export function refreshMarketShocks(
  c: Content,
  s: Pick<Save, "tick" | "knowledge" | "market" | "marketShocks">,
): void {
  for (const shock of c.economy.marketShocks) {
    if (
      Object.hasOwn(s.marketShocks, shock.id) ||
      !s.knowledge.includes(shock.requiredReactionId) ||
      !companyKnowsMaterial(c, s, shock.materialId)
    )
      continue;
    const state = ensureMarket(c, s, shock.materialId);
    if (!state) continue;
    state.demandBps = Math.max(state.demandBps, shock.targetDemandBps);
    s.marketShocks[shock.id] = { triggeredAt: s.tick };
  }
}

export function marketBulletins(
  c: Content,
  s: Pick<Save, "knowledge" | "market" | "marketShocks">,
): MarketBulletinView[] {
  return c.economy.marketShocks
    .flatMap((definition) => {
      const state = s.marketShocks[definition.id];
      const market = s.market[definition.materialId];
      return state &&
        market &&
        companyKnowsMaterial(c, s, definition.materialId)
        ? [{
            id: definition.id,
            nameKey: definition.nameKey,
            briefKey: definition.briefKey,
            materialId: definition.materialId,
            triggeredAt: state.triggeredAt,
            demandBps: market.demandBps,
          }]
        : [];
    })
    .sort((a, b) => a.triggeredAt - b.triggeredAt || a.id.localeCompare(b.id));
}

export function marketListings(
  c: Content,
  s: Pick<Save, "knowledge" | "market" | "milestones">,
): MarketListingView[] {
  return c.economy.exchange
    .filter((listing) => companyKnowsMaterial(c, s, listing.materialId))
    .map((listing) => {
      const state = s.market[listing.materialId] ?? {
        demandBps: listing.baseDemandBps,
        saturationBps: 0,
      };
      return {
        materialId: listing.materialId,
        demandBps: state.demandBps,
        saturationBps: state.saturationBps,
        compensationPerUnit: marketCompensation(c, s, listing.materialId),
        handling: listing.requiredTerminalCapabilityId
          ? {
              nameKey: c.economy.terminalCapabilities.find(
                (capability) =>
                  capability.id === listing.requiredTerminalCapabilityId,
              )!.nameKey,
              unlocked: terminalCapabilityUnlocked(
                c,
                s,
                listing.requiredTerminalCapabilityId,
              ),
            }
          : null,
      };
    });
}
