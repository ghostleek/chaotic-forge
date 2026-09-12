'use client';

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FlaskConical,
  LockKeyhole,
  Play,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DASH_LOCKED_CONDITIONS,
  DASH_RECHARGE_OPTIONS,
  DEFAULT_DASH_GOAL,
  buildDashExperiment,
  serializeDashExperimentJson,
  serializeDashExperimentMarkdown,
  type DashRechargeOptionId,
} from '@/lib/mechanics/dash-experiment';

function downloadText(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DashExperimentBuilder() {
  const [goal, setGoal] = useState(DEFAULT_DASH_GOAL);
  const [mutationId, setMutationId] =
    useState<DashRechargeOptionId>('elimination');
  const [saved, setSaved] = useState(false);
  const experiment = useMemo(
    () => buildDashExperiment(goal, mutationId),
    [goal, mutationId],
  );
  const changedRule = experiment.changedRules[0];
  const previewHref = `/microplays/dash/preview?${new URLSearchParams({
    goal: experiment.goal,
    mutation: mutationId,
  }).toString()}`;

  const updateMutation = (value: string) => {
    const isKnownOption = DASH_RECHARGE_OPTIONS.some(
      (option) => option.id === value,
    );
    if (!isKnownOption) return;
    setMutationId(value as DashRechargeOptionId);
    setSaved(false);
  };

  return (
    <>
      <header className="forge-hero">
        <div>
          <p className="reference-kicker">
            <FlaskConical aria-hidden="true" /> Your decision
          </p>
          <label className="forge-goal" htmlFor="experiment-goal">
            <span>Design goal</span>
            <Textarea
              id="experiment-goal"
              value={goal}
              onChange={(event) => {
                setGoal(event.target.value);
                setSaved(false);
              }}
            />
          </label>
          <p>
            Start with the referenced dash behavior, then isolate one
            Forge-defined experiment rule.
          </p>
        </div>
        <div className="experiment-count">
          <strong>{experiment.changedRules.length}</strong>
          <span>rule changes</span>
          <small>{DASH_LOCKED_CONDITIONS.length} conditions stay matched</small>
        </div>
      </header>

      <section className="experiment-contract" aria-labelledby="contract-title">
        <div className="section-heading">
          <div>
            <p>Experiment contract</p>
            <h1 id="contract-title">
              One rule changes. Everything else stays matched.
            </h1>
          </div>
          <span>{saved ? 'Saved in this session' : 'Unsaved draft'}</span>
        </div>

        <div className="variant-decision">
          <div>
            <span>Control A</span>
            <strong>{changedRule.control.label}</strong>
            <small>Experiment baseline · Forge-defined</small>
          </div>
          <label htmlFor="mutation-recharge">
            <span>Variant B · Your decision</span>
            <select
              id="mutation-recharge"
              value={mutationId}
              onChange={(event) => updateMutation(event.target.value)}
            >
              {DASH_RECHARGE_OPTIONS.map((option) => (
                <option value={option.id} key={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <table
          className="variant-comparison"
          aria-label="Dash recharge variants"
        >
          <thead>
            <tr className="variant-row variant-row--heading">
              <th scope="col">Rule</th>
              <th scope="col">
                Control A <small>Experiment baseline · Forge-defined</small>
              </th>
              <th scope="col">
                Variant B <small>Your decision</small>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="variant-row variant-row--changed">
              <th scope="row">Dash recharge</th>
              <td>{changedRule.control.label}</td>
              <td>{changedRule.mutation.label}</td>
            </tr>
            {DASH_LOCKED_CONDITIONS.map((condition) => (
              <tr className="variant-row" key={condition.field}>
                <th scope="row">
                  <LockKeyhole aria-hidden="true" /> {condition.field}
                </th>
                <td>
                  <Check aria-hidden="true" /> {condition.value}
                </td>
                <td>
                  <Check aria-hidden="true" /> Matched
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="adaptation-boundary" aria-label="Provenance boundary">
        <div>
          <span className="provenance-label provenance-label--source">
            Preserved from the reference
          </span>
          <p>{experiment.reference.behavior}</p>
        </div>
        <div>
          <span className="provenance-label provenance-label--interpretation">
            Experiment baseline
          </span>
          <p>
            The three-second timer is Forge-defined, not a claim about Returnal.
          </p>
        </div>
        <div>
          <span className="provenance-label provenance-label--decision">
            Your decision
          </span>
          <p>{changedRule.mutation.label}.</p>
        </div>
      </section>

      <aside className="risk-callout">
        <AlertTriangle aria-hidden="true" />
        <div>
          <strong>Review the consequence before building</strong>
          <ul>
            {experiment.risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="export-preview" aria-labelledby="export-title">
        <div>
          <span>Production handoff</span>
          <h2 id="export-title">Keep the experiment portable.</h2>
          <p>
            Both exports retain the reference boundary, one-rule diff, locked
            conditions, risks, and evidence plan.
          </p>
        </div>
        <div className="export-actions">
          <Button type="button" onClick={() => setSaved(true)}>
            {saved ? (
              <CheckCircle2 aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {saved ? 'Experiment saved' : 'Save experiment contract'}
          </Button>
          {saved ? (
            <Link className="primary-action" href={previewHref}>
              <Play aria-hidden="true" /> Preview matched A/B
            </Link>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              downloadText(
                'dash-aggression-loop.md',
                serializeDashExperimentMarkdown(experiment),
                'text/markdown',
              )
            }
          >
            <Download aria-hidden="true" /> Download Markdown
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              downloadText(
                'dash-aggression-loop.json',
                serializeDashExperimentJson(experiment),
                'application/json',
              )
            }
          >
            <Download aria-hidden="true" /> Download JSON
          </Button>
        </div>
        <p className="sr-only" aria-live="polite">
          {saved ? 'Experiment contract saved in this browser session.' : ''}
        </p>
      </section>

      <footer className="forge-next-step">
        <span>Next implementation slice</span>
        <strong>
          Turn this exact contract into two deterministic 45-second creator
          previews.
        </strong>
      </footer>
    </>
  );
}
