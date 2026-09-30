import type { Content } from "@site/content";
import type {
  AssistanceReason,
  AssistanceView,
  CompanyView,
  Save,
} from "./types";

type AssistanceDefinition =
  Content["economy"]["assistancePackages"][number];

type ResolvedAssistance = AssistanceDefinition & {
  legacy: boolean;
};

function legacyAssistance(c: Content): ResolvedAssistance {
  return {
    id: "legacy-emergency",
    nameKey: "assistance.legacy-emergency.name",
    briefKey: "assistance.legacy-emergency.brief",
    fuelBelow: c.economy.assistanceBelow,
    grantFuel: c.economy.grant,
    baseObligationFuel: c.economy.grant,
    repeatObligationStepFuel: 0,
    continuationObligationFuel: c.economy.grant,
    recoveryNetFuel: c.economy.grant,
    legacy: true,
  };
}

export function assistanceDefinition(
  c: Content,
  packageId?: string | null,
): ResolvedAssistance | null {
  if (!c.economy.assistancePackages.length)
    return packageId && packageId !== "legacy-emergency"
      ? null
      : legacyAssistance(c);
  const id = packageId ?? c.economy.defaultAssistancePackageId;
  const definition = c.economy.assistancePackages.find(
    (entry) => entry.id === id,
  );
  return definition ? { ...definition, legacy: false } : null;
}

export function assistanceEligibility(
  c: Content,
  s: Pick<Save, "fuel" | "debt" | "company">,
  packageId?: string | null,
): {
  definition: ResolvedAssistance | null;
  eligible: boolean;
  reason: AssistanceReason;
  nextObligationFuel: number;
  mode: "intervention" | "continuation" | null;
} {
  const definition = assistanceDefinition(c, packageId);
  if (!definition)
    return {
      definition: null,
      eligible: false,
      reason: null,
      nextObligationFuel: 0,
      mode: null,
    };
  const interventionObligation =
    definition.baseObligationFuel +
    definition.repeatObligationStepFuel * s.company.interventionStreak;
  if (s.debt > 0) {
    const sameRecoveryPackage = definition.legacy
      ? s.company.recoveryPackageId === null
      : s.company.recoveryPackageId === definition.id;
    if (
      s.company.standing !== "recovery" ||
      !sameRecoveryPackage ||
      s.company.repaidSinceAssistanceFuel <
        definition.continuationObligationFuel
    )
      return {
        definition,
        eligible: false,
        reason: "obligation-open",
        nextObligationFuel: definition.continuationObligationFuel,
        mode: null,
      };
    if (s.fuel >= definition.fuelBelow)
      return {
        definition,
        eligible: false,
        reason: "fuel-not-depleted",
        nextObligationFuel: definition.continuationObligationFuel,
        mode: null,
      };
    return {
      definition,
      eligible: true,
      reason: null,
      nextObligationFuel: definition.continuationObligationFuel,
      mode: "continuation",
    };
  }
  if (s.fuel >= definition.fuelBelow)
    return {
      definition,
      eligible: false,
      reason: "fuel-not-depleted",
      nextObligationFuel: interventionObligation,
      mode: null,
    };
  return {
    definition,
    eligible: true,
    reason: null,
    nextObligationFuel: interventionObligation,
    mode: "intervention",
  };
}

export function applyAssistance(
  c: Content,
  s: Pick<Save, "fuel" | "debt" | "company">,
  packageId?: string | null,
): {
  ok: boolean;
  reason: AssistanceReason;
  grantFuel: number;
  obligationFuel: number;
} {
  const eligibility = assistanceEligibility(c, s, packageId);
  if (!eligibility.eligible || !eligibility.definition)
    return {
      ok: false,
      reason: eligibility.reason,
      grantFuel: 0,
      obligationFuel: 0,
    };
  const definition = eligibility.definition;
  s.fuel += definition.grantFuel;
  s.debt += eligibility.nextObligationFuel;
  s.company.standing = "recovery";
  if (eligibility.mode === "intervention") {
    s.company.interventionStreak++;
    s.company.recoveryNetFuel = 0;
    s.company.recoveryPackageId = definition.legacy ? null : definition.id;
  }
  s.company.repaidSinceAssistanceFuel = 0;
  return {
    ok: true,
    reason: null,
    grantFuel: definition.grantFuel,
    obligationFuel: eligibility.nextObligationFuel,
  };
}

function recoveryDefinition(
  c: Content,
  s: Pick<Save, "company">,
): ResolvedAssistance {
  return (
    assistanceDefinition(c, s.company.recoveryPackageId) ??
    legacyAssistance(c)
  );
}

export function recordObligationRepayment(
  s: Pick<Save, "company">,
  repaidFuel: number,
): void {
  if (repaidFuel <= 0 || s.company.standing !== "recovery") return;
  s.company.repaidSinceAssistanceFuel += repaidFuel;
}

export function recordNetExportRecovery(
  c: Content,
  s: Pick<Save, "debt" | "company">,
  netFuel: number,
): void {
  if (
    netFuel <= 0 ||
    s.debt > 0 ||
    s.company.standing !== "recovery"
  )
    return;
  const definition = recoveryDefinition(c, s);
  s.company.recoveryNetFuel += netFuel;
  if (s.company.recoveryNetFuel < definition.recoveryNetFuel) return;
  s.company.standing = "clear";
  s.company.interventionStreak = 0;
  s.company.recoveryNetFuel = 0;
  s.company.recoveryPackageId = null;
  s.company.repaidSinceAssistanceFuel = 0;
}

export function assistanceViews(
  c: Content,
  s: Pick<Save, "fuel" | "debt" | "company">,
): AssistanceView[] {
  const definitions: ResolvedAssistance[] = c.economy.assistancePackages.length
    ? c.economy.assistancePackages.map((definition) => ({
        ...definition,
        legacy: false,
      }))
    : [legacyAssistance(c)];
  return definitions.map((definition) => {
    const eligibility = assistanceEligibility(c, s, definition.id);
    return {
      id: definition.id,
      nameKey: definition.nameKey,
      briefKey: definition.briefKey,
      grantFuel: definition.grantFuel,
      nextObligationFuel: eligibility.nextObligationFuel,
      eligible: eligibility.eligible,
      reason: eligibility.reason,
    };
  });
}

export function companyView(
  c: Content,
  s: Pick<Save, "company">,
): CompanyView {
  const target =
    s.company.standing === "recovery"
      ? recoveryDefinition(c, s).recoveryNetFuel
      : 0;
  return {
    standing: s.company.standing,
    interventionStreak: s.company.interventionStreak,
    recoveryNetFuel: s.company.recoveryNetFuel,
    recoveryPackageId: s.company.recoveryPackageId,
    recoveryTargetNetFuel: target,
  };
}
