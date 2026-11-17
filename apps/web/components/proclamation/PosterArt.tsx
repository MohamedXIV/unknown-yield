import type { ReactElement } from "react";
import type { ProclamationIllustration } from "../../game/proclamations";

/**
 * Poster scenes drawn in code so every announcement has art without an asset
 * pipeline. They use the poster palette through CSS variables. A raster poster
 * can replace any of them later by being passed as `image` to the presenter.
 */
const rays = Array.from({ length: 13 }, (_, i) => {
  const a = ((i - 6) * 11 * Math.PI) / 180;
  const x = 160 + Math.sin(a) * 260;
  const y = 150 - Math.cos(a) * 260;
  const w = 7;
  return `M160 150 L${(x - w * Math.cos(a)).toFixed(1)} ${(y - w * Math.sin(a)).toFixed(1)} L${(x + w * Math.cos(a)).toFixed(1)} ${(y + w * Math.sin(a)).toFixed(1)} Z`;
});

function Sunburst() {
  return (
    <g className="pa-rays" aria-hidden="true">
      {rays.map((d) => (
        <path key={d} d={d} />
      ))}
      <circle cx="160" cy="150" r="46" className="pa-sun" />
    </g>
  );
}

const ground = <path className="pa-ink" d="M0 180 V150 H320 V180 Z" />;

function Skyline() {
  return (
    <g className="pa-ink" aria-hidden="true">
      <path d="M0 150 V118 h14 v-26 h8 v26 h16 v-14 h20 v14 h12 V150 Z" />
      <path d="M232 150 V112 h18 v-30 h6 v30 h14 v-18 h18 v18 h14 V150 Z" />
    </g>
  );
}

const motifs: Record<ProclamationIllustration, ReactElement> = {
  premises: (
    <g>
      <path className="pa-ink" d="M104 150 V104 h24 v-34 h10 v34 h22 v-20 h26 v20 h14 V150 Z" />
      <path className="pa-ink" d="M126 70 h6 v-26 h-6 Z" />
      <path className="pa-smoke" d="M129 40 c-8 -10 8 -16 0 -28 c14 8 4 18 14 26 c-10 2 -8 -2 -14 2 Z" />
      <rect x="150" y="104" width="26" height="30" className="pa-paper" />
      <path className="pa-red" d="M152 108 h22 v22 h-22 Z" />
      <g className="pa-flag"><path d="M196 84 V40" className="pa-line" /><path className="pa-red" d="M196 40 h30 l-8 10 8 10 h-30 Z" /></g>
    </g>
  ),
  reduction: (
    <g>
      <circle cx="160" cy="104" r="34" className="pa-ink" />
      <circle cx="160" cy="104" r="12" className="pa-paper" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x="154" y="62" width="12" height="14" className="pa-ink" transform={`rotate(${i * 36} 160 104)`} />
      ))}
      <path className="pa-red" d="M120 150 V128 l24 -14 v36 Z M200 150 V128 l-24 -14 v36 Z" />
    </g>
  ),
  expansion: (
    <g>
      <path className="pa-ink" d="M158 44 c10 12 12 30 12 52 h-24 c0 -22 2 -40 12 -52 Z" />
      <path className="pa-red" d="M146 96 l-14 20 h14 Z M170 96 l14 20 h-14 Z" />
      <circle cx="158" cy="78" r="5" className="pa-paper" />
      <path className="pa-smoke" d="M150 100 c-6 18 -2 30 8 40 c10 -10 14 -22 8 -40 Z" />
      <path className="pa-line pa-pipes" d="M30 150 V132 H92 M290 150 V126 H228" />
    </g>
  ),
  equipment: (
    <g>
      <circle cx="160" cy="100" r="26" className="pa-ink" />
      <circle cx="160" cy="100" r="9" className="pa-paper" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="155" y="66" width="10" height="12" className="pa-ink" transform={`rotate(${i * 45} 160 100)`} />
      ))}
      <path className="pa-red" d="M196 74 l30 -16 l6 10 l-30 16 Z" />
    </g>
  ),
  discovery: (
    <g>
      <path className="pa-ink" d="M148 56 h24 v22 l22 44 c4 10 -2 16 -12 16 h-44 c-10 0 -16 -6 -12 -16 l22 -44 Z" />
      <path className="pa-red" d="M134 116 h52 l8 16 h-68 Z" />
      <path className="pa-star" d="M160 18 l5 12 13 1 -10 9 3 13 -11 -7 -11 7 3 -13 -10 -9 13 -1 Z" />
    </g>
  ),
  milestone: (
    <g>
      <path className="pa-ink" d="M92 150 v-24 h36 v-24 h36 v-24 h36 V150 Z" />
      <path className="pa-star" d="M200 30 l7 16 17 2 -13 12 4 17 -15 -9 -15 9 4 -17 -13 -12 17 -2 Z" />
    </g>
  ),
  bulletin: (
    <g>
      <path d="M160 150 V50" className="pa-line" />
      <path className="pa-red" d="M160 50 h64 l-14 18 14 18 h-64 Z" />
      <path className="pa-star" d="M178 68 l3 7 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5 8 -1 Z" />
    </g>
  ),
};

export default function PosterArt({ scene }: { scene: ProclamationIllustration }) {
  return (
    <svg className="poster-art" viewBox="0 0 320 180" role="img" aria-label="" preserveAspectRatio="xMidYMid slice">
      <rect width="320" height="180" className="pa-paper" />
      <Sunburst />
      <Skyline />
      {ground}
      {motifs[scene]}
      <path className="pa-grain" d="M0 0 H320 V180 H0 Z" />
    </svg>
  );
}
