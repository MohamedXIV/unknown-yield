import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { it, expect, vi } from "vitest";
import type { PlayerSnapshot } from "@site/sim-core";
import { observationKey, unseenObservations } from "../game/observations";

type Observation = PlayerSnapshot["observations"][number];

const ambient: Observation = {
  operationId: "heat",
  inputId: "raw",
  outputId: "residue",
  textKey: "reaction.heat-raw.observation",
  initial: true,
};
const sealed: Observation = {
  operationId: "heat",
  inputId: "raw",
  outputId: "granules",
  textKey: "reaction.heat-raw-sealed.observation",
  initial: false,
  observedAt: { x: 1, y: 2 },
};

it("keeps condition variants distinct for keys and discovery tracking", () => {
  expect(new Set([ambient, sealed].map(observationKey))).toEqual(
    new Set([ambient.textKey, sealed.textKey]),
  );
  expect(
    unseenObservations([ambient, sealed], new Set([observationKey(ambient)])),
  ).toEqual([sealed]);
});

it("renders both heat observations without duplicate React keys", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const markup = renderToStaticMarkup(
      createElement(
        "section",
        null,
        ...[ambient, sealed].map((observation) =>
          createElement(
            "article",
            { key: observationKey(observation) },
            observation.textKey,
          ),
        ),
      ),
    );
    expect(markup.match(/<article/g) ?? []).toHaveLength(2);
    expect(markup).toContain(ambient.textKey);
    expect(markup).toContain(sealed.textKey);
    expect(error).not.toHaveBeenCalled();
  } finally {
    error.mockRestore();
  }
});
