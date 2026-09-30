import type { Content } from "@site/content";
import type { MarketListingView, MarketState, Save } from "./types";
import { terminalCapabilityUnlocked } from "./milestones";
import { recordNetExportRecovery } from "./assistance";

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
  }
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
