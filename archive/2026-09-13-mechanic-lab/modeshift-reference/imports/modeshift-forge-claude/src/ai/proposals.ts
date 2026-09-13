import { MODE_CONFIGS, type GameMetrics, type GameMode, type ModeConfig } from "../shared/game-contract";

export type PrimaryMetric =
  | "completion_time"
  | "falls"
  | "path_efficiency"
  | "hazard_exposure"
  | "discoveries"
  | "focus_remaining";

export type ProposalSource = "local-deterministic" | "astra";

export type ModeProposal = {
  proposalId: string;
  title: string;
  mode: GameMode;
  config: ModeConfig;
  designPrinciple: string;
  predictedBehavior: string;
  primaryMetric: PrimaryMetric;
  fairnessRisk: string;
  playtestQuestion: string;
  /** Numeric commitment so the results screen can be honest about the miss. */
  expected: { value: number; unit: string; direction: "increase" | "decrease" };
  source: ProposalSource;
};

const LIBRARY: Array<{ keywords: string[]; proposal: Omit<ModeProposal, "source"> }> = [
  {
    keywords: [
      "immersive",
      "exploratory",
      "explore",
      "presence",
      "first person",
      "depth",
      "discover",
      "atmosphere",
      "spatial",
      "embodied",
    ],
    proposal: {
      proposalId: "inhabit-depth-truth",
      title: "Make Inhabit the ground truth the other projections distort",
      mode: "firstPerson",
      config: MODE_CONFIGS.firstPerson,
      designPrinciple:
        "A projection is only legible as a lie if the player has seen the truth. Embodiment has to come first.",
      predictedBehavior:
        "Players who walk the gap edge in Inhabit see three slabs at three different depths, so the span they later stand on reads as their own inference rather than a gift.",
      primaryMetric: "discoveries",
      fairnessRisk:
        "Mouse-look raises the motor floor, and Inhabit is now the only mode that collects — if pointer lock fails, the run is unfinishable. Drag-to-look must stay a complete path.",
      playtestQuestion:
        "Do players credit their own spatial reasoning for the span, or does it feel like the game unlocked it for them?",
      expected: { value: 2, unit: "discoveries", direction: "increase" },
    },
  },
  {
    keywords: [
      "tactical",
      "overview",
      "risk",
      "hazard",
      "plan",
      "safe",
      "route",
      "danger",
      "overhead",
      "map",
      "patrol",
      "freeze",
    ],
    proposal: {
      proposalId: "command-frozen-legibility",
      title: "Trade immediacy for control: freeze the world in Command",
      mode: "tactical",
      config: MODE_CONFIGS.tactical,
      designPrinciple:
        "Players accept punishment they could have foreseen. Stopping time makes risk inspectable without making it survivable.",
      predictedBehavior:
        "With the hazard footprint and the sentry sweep held still, players plan the low-exposure lane in Command and then commit to it embodied, instead of improvising inside the field.",
      primaryMetric: "hazard_exposure",
      fairnessRisk:
        "A frozen overhead view can trivialise the chamber. It must reveal risk and never resolve it — which is why Command cannot move the body or take a core.",
      playtestQuestion:
        "After one Command look, do players commit to a plan — or sit in the freeze because nothing can hurt them there?",
      expected: { value: 4, unit: "s exposed", direction: "decrease" },
    },
  },
  {
    keywords: [
      "precise",
      "precision",
      "timing",
      "tight",
      "platform",
      "jump",
      "readable",
      "arcade",
      "skill",
      "flow",
      "puzzle",
      "impossible",
      "bridge",
      "connect",
    ],
    proposal: {
      proposalId: "traverse-projection-cost",
      title: "Price the projection: make Traverse a decision, not a camera",
      mode: "platformer",
      config: MODE_CONFIGS.platformer,
      designPrinciple:
        "If two surfaces appear connected in a projection, they are connected while it holds. An ability that rewrites geometry has to be rationed or it becomes the only mode.",
      predictedBehavior:
        "At 12% Focus per second, players stop parking in Traverse. They enter it at the gap edge, cross with intent, and drop back to Inhabit on the far lip with Focus to spare.",
      primaryMetric: "focus_remaining",
      fairnessRisk:
        "A projection that collapses under a player mid-span is a trust problem, not a difficulty curve. The unstable band must be visible before it bites, and a collapse must never respawn them into the void they were crossing.",
      playtestQuestion:
        "Does running low on Focus feel like a budget the player mismanaged, or like the game moving the goalposts?",
      expected: { value: 30, unit: "% Focus left", direction: "increase" },
    },
  },
];

const DEFAULT_INDEX = 2;

/**
 * Deterministic: the same prompt always yields the same proposal. No model call,
 * no randomness — this is what ships as "Demo fallback".
 */
export function proposeLocally(prompt: string): ModeProposal {
  const text = prompt.toLowerCase();
  let bestIndex = -1;
  let bestScore = 0;
  LIBRARY.forEach((entry, i) => {
    let score = 0;
    for (const k of entry.keywords) if (text.includes(k)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  });
  const chosen = LIBRARY[bestIndex >= 0 ? bestIndex : DEFAULT_INDEX];
  return { ...chosen.proposal, source: "local-deterministic" };
}

export function actualForMetric(
  metric: PrimaryMetric,
  m: GameMetrics,
  focus?: number,
): { value: number; unit: string } {
  switch (metric) {
    case "completion_time":
      return { value: m.elapsedMs / 1000, unit: "s" };
    case "falls":
      return { value: m.falls, unit: "falls" };
    case "path_efficiency":
      return { value: m.pathLength, unit: "m travelled" };
    case "hazard_exposure":
      return { value: m.hazardExposureMs / 1000, unit: "s exposed" };
    case "discoveries":
      return { value: m.discoveries, unit: "discoveries" };
    case "focus_remaining":
      return { value: focus ?? 0, unit: "% Focus left" };
  }
}

export function metricLabel(metric: PrimaryMetric): string {
  switch (metric) {
    case "completion_time":
      return "Completion time";
    case "falls":
      return "Falls";
    case "path_efficiency":
      return "Path length";
    case "hazard_exposure":
      return "Hazard exposure";
    case "discoveries":
      return "Discoveries";
    case "focus_remaining":
      return "Focus remaining";
  }
}

const VALID_MODES: GameMode[] = ["platformer", "firstPerson", "tactical"];

/** Guard for anything that arrives from a server. The model picks values, never code. */
export function validateProposal(raw: unknown): ModeProposal | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const mode = r.mode;
  if (typeof mode !== "string" || !VALID_MODES.includes(mode as GameMode)) return null;
  const strings = [
    "proposalId",
    "title",
    "designPrinciple",
    "predictedBehavior",
    "fairnessRisk",
    "playtestQuestion",
  ] as const;
  for (const key of strings) if (typeof r[key] !== "string" || !r[key]) return null;
  const metric = r.primaryMetric;
  const metrics: PrimaryMetric[] = [
    "completion_time",
    "falls",
    "path_efficiency",
    "hazard_exposure",
    "discoveries",
    "focus_remaining",
  ];
  if (typeof metric !== "string" || !metrics.includes(metric as PrimaryMetric)) return null;
  const expected = r.expected as Record<string, unknown> | undefined;
  const safeExpected =
    expected && typeof expected.value === "number" && typeof expected.unit === "string"
      ? {
          value: expected.value,
          unit: expected.unit,
          direction: expected.direction === "increase" ? ("increase" as const) : ("decrease" as const),
        }
      : { value: 0, unit: "", direction: "increase" as const };

  return {
    proposalId: String(r.proposalId),
    title: String(r.title),
    mode: mode as GameMode,
    // The server never supplies configuration: it selects a supported mode and
    // we look up the config we already shipped.
    config: MODE_CONFIGS[mode as GameMode],
    designPrinciple: String(r.designPrinciple),
    predictedBehavior: String(r.predictedBehavior),
    primaryMetric: metric as PrimaryMetric,
    fairnessRisk: String(r.fairnessRisk),
    playtestQuestion: String(r.playtestQuestion),
    expected: safeExpected,
    source: "astra",
  };
}
