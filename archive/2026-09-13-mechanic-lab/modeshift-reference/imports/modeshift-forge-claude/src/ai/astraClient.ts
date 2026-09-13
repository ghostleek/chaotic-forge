import { proposeLocally, validateProposal, type ModeProposal } from "./proposals";

const ENDPOINT = import.meta.env.VITE_ASTRA_ENDPOINT as string | undefined;
const TIMEOUT_MS = 6000;
/** Deliberation beat so the local proposal does not appear instantly and lie about being free. */
const LOCAL_THINK_MS = 620;

export type ProposalResult = {
  proposal: ModeProposal;
  /** Present when a live call was attempted and did not produce a usable answer. */
  fallbackReason?: string;
};

let inFlight = 0;

/**
 * One narrow surface. With no endpoint configured this is purely local and says
 * so; the game never depends on it.
 */
export async function requestProposal(prompt: string): Promise<ProposalResult> {
  const ticket = ++inFlight;
  const local = proposeLocally(prompt);

  if (!ENDPOINT) {
    await new Promise((r) => setTimeout(r, LOCAL_THINK_MS));
    if (ticket !== inFlight) throw new StaleResponse();
    return { proposal: local };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });
    if (ticket !== inFlight) throw new StaleResponse();
    if (!res.ok) return { proposal: local, fallbackReason: `endpoint returned ${res.status}` };
    const validated = validateProposal(await res.json());
    if (!validated) return { proposal: local, fallbackReason: "response failed validation" };
    return { proposal: validated };
  } catch (err) {
    if (err instanceof StaleResponse) throw err;
    const reason = err instanceof Error && err.name === "AbortError" ? "timed out" : "request failed";
    if (ticket !== inFlight) throw new StaleResponse();
    return { proposal: local, fallbackReason: reason };
  } finally {
    clearTimeout(timer);
  }
}

export class StaleResponse extends Error {
  constructor() {
    super("A newer proposal request superseded this one.");
    this.name = "StaleResponse";
  }
}

export const astraConfigured = Boolean(ENDPOINT);
