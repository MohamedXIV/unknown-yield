import type {
  FactoryThroughputRate,
  FactoryView,
} from "@site/sim-core";

export type FactoryRatePresentation = {
  materialId: string;
  name: string;
  unitsPerMinute: number;
};

export type FactoryContractPresentation = {
  certified: boolean;
  status: "Certified contract" | "Contract not certified";
  detail: string;
  inputs: FactoryRatePresentation[];
  outputs: FactoryRatePresentation[];
  worldText: string;
};

const presentRates = (
  rates: FactoryThroughputRate[],
  materialName: (id: string) => string,
): FactoryRatePresentation[] =>
  rates.map((rate) => ({
    materialId: rate.materialId,
    name: materialName(rate.materialId),
    unitsPerMinute: rate.unitsPerMinute,
  }));

const compactRates = (rates: FactoryRatePresentation[]) =>
  rates.length
    ? rates.map((rate) => rate.name + " " + rate.unitsPerMinute + "/min").join(" · ")
    : "—";

export function factoryContractPresentation(
  factory: FactoryView,
  materialName: (id: string) => string,
): FactoryContractPresentation {
  const throughput = factory.contract.throughput;
  if (throughput.state !== "stable") {
    return {
      certified: false,
      status: "Contract not certified",
      detail:
        "Detailed boundary flow is still measuring or the factory is blocked. Open the interior for diagnosis.",
      inputs: [],
      outputs: [],
      worldText:
        "CONTRACT NOT CERTIFIED\nMEASURING / BLOCKED\nOPEN FOR DIAGNOSIS",
    };
  }

  const inputs = presentRates(throughput.inputs, materialName),
    outputs = presentRates(throughput.outputs, materialName);
  return {
    certified: true,
    status: "Certified contract",
    detail:
      "Stable detailed cycle · " +
      throughput.cycleTicks +
      " ticks. Rates are measured at wall ports.",
    inputs,
    outputs,
    worldText:
      "CERTIFIED CONTRACT\nIN  " +
      compactRates(inputs) +
      "\nOUT " +
      compactRates(outputs),
  };
}
