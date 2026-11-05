/**
 * Unknown Yield's initial planetary presentation, not a simulation rule.
 *
 * One cold-twilight world is deliberately authored before considering a
 * multi-planet system. This profile cannot change deposits, materials,
 * machine results, knowledge, pathfinding, or save schema. See #348.
 */
export type EnvironmentProfile = Readonly<{
  id: string;
  name: string;
  terrain: Readonly<{
    background: `#${string}`;
    surface: number;
    textureOpacity: number;
    rockScatter: Readonly<{
      seed: number;
      count: number;
      shadow: number;
      light: number;
      oxidized: number;
      opacity: number;
    }>;
    depositShadow: number;
    depositHaloOpacity: number;
    depositEdge: number;
    depositEdgeOpacity: number;
    depositLabel: `#${string}`;
    terminalHalo: number;
    terminalHaloOpacity: number;
  }>;
  guides: Readonly<{
    grid: number;
    gridOpacity: number;
    tooltipBackground: `#${string}`;
  }>;
  /** Presentation references for future *measured*, opt-in light fixtures. */
  lightDirection: Readonly<{
    ambientColor: `#${string}`;
    ambientIntensity: number;
    practicalWarm: `#${string}`;
    warningWarm: `#${string}`;
  }>;
}>;

export const COLD_TWILIGHT_SITE = {
  id: "cold-twilight-site-01",
  name: "Cold Twilight / Ash Basalt",
  terrain: {
    background: "#253239",
    surface: 0x3f494b,
    textureOpacity: 0.16,
    rockScatter: {
      seed: 131,
      count: 1700,
      shadow: 0x263138,
      light: 0x85816b,
      oxidized: 0x785b4d,
      opacity: 0.32,
    },
    depositShadow: 0x192228,
    depositHaloOpacity: 0.13,
    depositEdge: 0xe0c590,
    depositEdgeOpacity: 0.5,
    depositLabel: "#d0c5a5",
    terminalHalo: 0xc49b6c,
    terminalHaloOpacity: 0.18,
  },
  guides: {
    grid: 0xb7c8c8,
    gridOpacity: 0.13,
    tooltipBackground: "#182329ed",
  },
  lightDirection: {
    ambientColor: "#a9bac2",
    ambientIntensity: 0.48,
    practicalWarm: "#e9b16c",
    warningWarm: "#dc6c47",
  },
} as const satisfies EnvironmentProfile;
