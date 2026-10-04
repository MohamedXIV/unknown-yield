import type { MachineStatus } from "@site/sim-core";

/**
 * Presentation labels for semantic machine status codes.
 *
 * Gameplay branches on `MachineStatus`; this exhaustive map turns codes into
 * generic English UI text. A missing entry fails typecheck, so the UI can
 * never render a raw code or `undefined` for a known status.
 */
const labels: Record<MachineStatus, string> = {
  processing: "Processing",
  incident: "Incident lockout",
  disabled: "Disabled",
  "deposit-exhausted": "Deposit exhausted",
  "source-exhausted": "Source exhausted",
  "needs-compatible-input": "Needs compatible input",
  "needs-input": "Needs input",
  "output-full": "Output full",
  "needs-fuel": "Needs fuel",
  ready: "Ready",
};

export function machineStatusLabel(status: MachineStatus): string {
  return labels[status];
}
