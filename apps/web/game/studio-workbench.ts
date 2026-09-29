import { createContentStore } from "@site/content/studio";

export type StudioKind = "material" | "operation" | "machine" | "reaction";
export type ContentStore = ReturnType<typeof createContentStore>;

const tables: Record<StudioKind, string> = {
  material: "materials",
  operation: "operations",
  machine: "machines",
  reaction: "reactions",
};

const idPattern = /^[a-z][a-z0-9-]*$/;

export function humanizeStudioId(id: string) {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function studioEntityIds(store: ContentStore, kind: StudioKind) {
  return Object.keys(store.getTable(tables[kind])).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function studioRow(
  store: ContentStore,
  kind: StudioKind,
  id: string,
): Record<string, string | number | boolean> {
  return store.getRow(tables[kind], id) as Record<
    string,
    string | number | boolean
  >;
}

export function studioLocaleText(store: ContentStore, key: string) {
  const value = store.getCell("locale", key, "text");
  return typeof value === "string" ? value : "";
}

export function setStudioLocaleText(
  store: ContentStore,
  key: string,
  text: string,
) {
  store.setCell("locale", key, "text", text);
}

function entityLocaleKeys(
  store: ContentStore,
  kind: StudioKind,
  id: string,
): string[] {
  const row = studioRow(store, kind, id),
    keys: string[] = [];
  const add = (value: unknown) => {
    if (typeof value === "string" && value) keys.push(value);
  };

  if (kind === "material" || kind === "operation" || kind === "machine")
    add(row.nameKey);
  if (kind === "machine") add(row.unlockHintKey);
  if (kind === "reaction") {
    add(row.observationKey);
    add(row.hazardNameKey);
    add(row.hazardObservationKey);
  }
  return keys;
}

export function studioEntityLabel(
  store: ContentStore,
  kind: StudioKind,
  id: string,
) {
  const row = studioRow(store, kind, id);
  if (kind === "reaction") return humanizeStudioId(id);
  return (
    studioLocaleText(store, String(row.nameKey ?? "")) || humanizeStudioId(id)
  );
}

export function createStudioEntity(
  store: ContentStore,
  kind: StudioKind,
  id: string,
) {
  const cleanId = id.trim();
  if (!idPattern.test(cleanId))
    throw new Error("ID must be lowercase letters/numbers with optional hyphens");
  if (store.hasRow(tables[kind], cleanId))
    throw new Error(kind + " ID already exists: " + cleanId);

  const label = humanizeStudioId(cleanId);
  if (kind === "material") {
    const nameKey = "material." + cleanId + ".name";
    store.setRow("materials", cleanId, {
      nameKey,
      color: "#888888",
      known: false,
    });
    store.setRow("locale", nameKey, { text: label });
  }
  if (kind === "operation") {
    const nameKey = "operation." + cleanId + ".name";
    store.setRow("operations", cleanId, { nameKey });
    store.setRow("locale", nameKey, { text: label });
  }
  if (kind === "machine") {
    const nameKey = "machine." + cleanId + ".name";
    store.setRow("machines", cleanId, {
      nameKey,
      role: "extractor",
      processConditionId: "",
      unlockReactionId: "",
      unlockHintKey: "",
      operationsJson: "[]",
      capacity: 8,
      fuel: 1,
      durationTicks: 20,
      width: 2,
      height: 2,
      cost: 20,
    });
    store.setRow("locale", nameKey, { text: label });
  }
  if (kind === "reaction") {
    const observationKey = "reaction." + cleanId + ".observation";
    store.setRow("reactions", cleanId, {
      operation: "",
      processConditionId: "",
      input: "",
      inputAmount: 1,
      output: "",
      outputAmount: 1,
      observationKey,
      hazardId: "",
      hazardNameKey: "",
      hazardObservationKey: "",
      known: false,
    });
    store.setRow("locale", observationKey, {
      text: "Describe the observed result for " + label + ".",
    });
  }

  return cleanId;
}

export function deleteStudioEntity(
  store: ContentStore,
  kind: StudioKind,
  id: string,
) {
  for (const key of entityLocaleKeys(store, kind, id))
    store.delRow("locale", key);
  store.delRow(tables[kind], id);
}

export function setMachineUnlock(
  store: ContentStore,
  id: string,
  reactionId: string,
) {
  const clean = reactionId.trim(),
    oldKey = String(store.getCell("machines", id, "unlockHintKey") ?? ""),
    key = clean ? "machine." + id + ".unlock-hint" : "";
  store.setCell("machines", id, "unlockReactionId", clean);
  store.setCell("machines", id, "unlockHintKey", key);
  if (!key && oldKey) store.delRow("locale", oldKey);
  if (key && !store.hasRow("locale", key))
    store.setRow("locale", key, {
      text: "Describe the confirmed knowledge required for this machine.",
    });
}

export function setReactionHazard(
  store: ContentStore,
  id: string,
  hazardId: string,
) {
  const clean = hazardId.trim(),
    oldName = String(store.getCell("reactions", id, "hazardNameKey") ?? ""),
    oldObservation = String(
      store.getCell("reactions", id, "hazardObservationKey") ?? "",
    ),
    nameKey = clean ? "hazard." + clean + ".name" : "",
    observationKey = clean ? "hazard." + clean + ".observation" : "";

  if (oldName === nameKey && oldObservation === observationKey) return;

  const oldNameText = oldName ? studioLocaleText(store, oldName) : "",
    oldObservationText = oldObservation
      ? studioLocaleText(store, oldObservation)
      : "";

  if (oldName) store.delRow("locale", oldName);
  if (oldObservation) store.delRow("locale", oldObservation);

  store.setCell("reactions", id, "hazardId", clean);
  store.setCell("reactions", id, "hazardNameKey", nameKey);
  store.setCell("reactions", id, "hazardObservationKey", observationKey);

  if (clean) {
    store.setRow("locale", nameKey, {
      text: oldNameText || humanizeStudioId(clean),
    });
    store.setRow("locale", observationKey, {
      text: oldObservationText || "Describe the observed hazard.",
    });
  }
}
