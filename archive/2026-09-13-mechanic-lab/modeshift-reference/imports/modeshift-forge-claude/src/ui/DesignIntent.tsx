import { useCallback, useRef, useState } from "react";
import { requestProposal, StaleResponse, astraConfigured } from "../ai/astraClient";
import { metricLabel, proposeLocally, type ModeProposal } from "../ai/proposals";
import { MODE_LABELS } from "../shared/game-contract";
import { setMode } from "../game/gameState";

const PREFILLED = "Make this platformer feel more immersive and exploratory.";

export type ProposalState = {
  proposal: ModeProposal;
  fallbackReason?: string;
  applied: boolean;
};

export function DesignIntent({
  proposalState,
  setProposalState,
}: {
  proposalState: ProposalState;
  setProposalState: (s: ProposalState) => void;
}) {
  const [prompt, setPrompt] = useState(PREFILLED);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const ask = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await requestProposal(prompt);
      setProposalState({ ...result, applied: false });
    } catch (err) {
      if (!(err instanceof StaleResponse)) {
        setProposalState({
          proposal: proposeLocally(prompt),
          fallbackReason: "request failed",
          applied: false,
        });
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [prompt, setProposalState]);

  const apply = useCallback(() => {
    setMode(proposalState.proposal.mode);
    setProposalState({ ...proposalState, applied: true });
  }, [proposalState, setProposalState]);

  const p = proposalState.proposal;
  const label = MODE_LABELS[p.mode];
  const sourceLine =
    p.source === "astra"
      ? "Astra · structured output, validated server-side"
      : astraConfigured
        ? `Demo fallback · local deterministic proposal${
            proposalState.fallbackReason ? ` (${proposalState.fallbackReason})` : ""
          }`
        : "Demo fallback · local deterministic proposal, no model call";

  return (
    <section className="panel panel--intent" aria-label="Design intent">
      <header className="panel__head">
        <span className="panel__index">01</span>
        <h2>Design intent</h2>
      </header>

      <label className="field">
        <span className="sr-only">Describe the experience you want</span>
        <textarea
          value={prompt}
          rows={2}
          spellCheck={false}
          placeholder="Describe the experience you want…"
          onChange={(e) => setPrompt(e.target.value)}
        />
      </label>

      <div className="row row--actions">
        <button type="button" className="btn btn--primary" onClick={ask} disabled={busy}>
          {busy ? "Deliberating…" : "Ask Astra"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={apply}
          disabled={busy || proposalState.applied}
        >
          {proposalState.applied ? "Mutation applied" : "Apply mutation"}
        </button>
      </div>

      <p className={`source ${p.source === "astra" ? "source--live" : "source--local"}`}>
        <span className="dot" aria-hidden="true" />
        {sourceLine}
      </p>

      <header className="panel__head panel__head--sub">
        <span className="panel__index">02</span>
        <h2>Hypothesis</h2>
      </header>

      <p className="proposal-title">
        <span className="tag" style={{ ["--accent" as string]: label.accent }}>
          {label.name}
        </span>
        {p.title}
      </p>

      <p className="metric-chip mono">
        <span>{metricLabel(p.primaryMetric)}</span>
        predicted {p.expected.direction === "increase" ? "≥" : "≤"} {p.expected.value}{" "}
        {p.expected.unit}
      </p>

      <dl className="spec">
        <dt>Design principle</dt>
        <dd>{p.designPrinciple}</dd>
        <dt>Predicted behaviour</dt>
        <dd>{p.predictedBehavior}</dd>
        <dt>Fairness / trust risk</dt>
        <dd>{p.fairnessRisk}</dd>
        <dt>Playtest question</dt>
        <dd>{p.playtestQuestion}</dd>
      </dl>
    </section>
  );
}

export const INITIAL_PROPOSAL: ProposalState = {
  proposal: proposeLocally(PREFILLED),
  applied: false,
};
