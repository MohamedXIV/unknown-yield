import type { Content } from "@site/content";
import type { Belt } from "./types";
/** Configured sides, ordered independently of world orientation. */
export function beltArms(c: Pick<Content, "junctions">, b: Belt) {
  const kind =
    b.junction &&
    c.junctions.find((d) => d.id === b.junction!.definitionId)?.kind;
  const back = (b.direction + 2) % 4;
  const side = (b.direction + (b.junction?.branch === -1 ? 3 : 1)) % 4;
  if (kind === "splitter")
    return { inlets: [back], outlets: [b.direction, side], kind };
  if (kind === "merger")
    return { inlets: [back, side], outlets: [b.direction], kind };
  if (kind === "crossing") {
    const outlets =
      b.direction % 2 === 0 ? [b.direction, side] : [side, b.direction];
    return { inlets: outlets.map((d) => (d + 2) % 4), outlets, kind };
  }
  return {
    inlets: [0, 1, 2, 3],
    outlets: [b.alternate !== null && b.switched ? b.alternate : b.direction],
    kind: null,
  };
}
