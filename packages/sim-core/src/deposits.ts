import type { Content } from "@site/content";
import type { Save } from "./types";

export type DepositDefinition =
  | Content["site"]["deposits"][number]
  | Content["site"]["hiddenDeposits"][number];

export function allDeposits(content: Content): DepositDefinition[] {
  return [...content.site.deposits, ...content.site.hiddenDeposits];
}

export function depositDefinition(
  content: Content,
  id: string | null,
): DepositDefinition | undefined {
  if (!id) return undefined;
  return allDeposits(content).find((deposit) => deposit.id === id);
}

export function hiddenDepositDefinition(
  content: Content,
  id: string | null,
): Content["site"]["hiddenDeposits"][number] | undefined {
  if (!id) return undefined;
  return content.site.hiddenDeposits.find((deposit) => deposit.id === id);
}

export function depositDepth(content: Content, id: string): number {
  const hidden = hiddenDepositDefinition(content, id);
  if (!hidden) return 0;
  return (
    content.site.surveySignals.find(
      (signal) => signal.id === hidden.surveySignalId,
    )?.depth ?? 0
  );
}

export function visibleDeposits(
  content: Content,
  state: Save,
): DepositDefinition[] {
  return [
    ...content.site.deposits,
    ...content.site.hiddenDeposits.filter((deposit) =>
      state.discoveredDeposits.includes(deposit.id),
    ),
  ];
}
