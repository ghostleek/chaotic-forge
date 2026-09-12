# Astra Build and Submission Guide

## 1. Decision for this hackathon

Use Astra throughout the build, but do not add a runtime model dependency unless the organizers explicitly require it.

The [official event brief](https://luma.com/fdzbrq5b) requires teams to use Astra during the build, submit a deployed working prototype, and provide a 90-second video showing the prototype and explaining how Astra was used. It does not state that the prototype itself must call Astra. That makes a reliable, honest golden flow a stronger default than a last-minute API integration.

Mechanic Forge's current decomposition, preview, and tester report are deterministic. Never describe those interactions as a live Astra generation or as external evidence.

## 2. Keep an Astra build log

For each material use, capture four short fields:

```text
Problem:
Astra contribution:
Human decision:
Proof: commit, test, screenshot, or visible behavior
```

Useful entries include:

- turning the product thesis into the G1–G4 golden flow;
- converting Returnal research into a provenance-aware mechanic breakdown;
- isolating one changed recharge rule and locking the test conditions;
- generating or challenging edge cases for deterministic preview and tester sessions;
- reviewing accessibility, responsive layout, evidence language, and scope;
- diagnosing failures and proposing the smallest verified fix.

Do not list prompts without outcomes. Judges need to see where Astra changed the quality or speed of the build.

## 3. Runtime integration decision gate

Add a runtime call only if all of these are true:

1. The kickoff or judging rubric explicitly requires it, or a core user task clearly benefits.
2. The result can be shown within the 90-second story.
3. Structured output can be validated before it reaches the interface.
4. Failure, latency, and rate limits do not break the golden flow.
5. A deterministic fallback preserves the demo.

If the gate passes, constrain the first call to one task: suggest missing mechanic-contract fields from the creator's intent. Label the result **Forge interpretation**, never **From the source**, and require user confirmation before it becomes **Your decision**.

## 4. Ninety-second video storyboard

| Time   | Show                                   | Say                                                                                       |
| ------ | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| 0–8s   | Explore landing and popular games      | “Mechanic Forge turns proven game patterns into the smallest credible design test.”       |
| 8–22s  | Returnal to projectile-phasing dash    | Start from a recognizable game and reveal its mechanics instead of a blank canvas.        |
| 22–38s | Breakdown and provenance labels        | Separate sourced behavior, Forge interpretation, and the creator's decision.              |
| 38–55s | One-rule adaptation and A/B preview    | Change only recharge; keep movement, damage, arena, enemies, seed, and duration matched.  |
| 55–72s | Blind share flow, report, and decision | Show no-account validation while stating that this demo is local-only, descriptive `n=1`. |
| 72–84s | Astra build log                        | Name two concrete implementation, testing, or review contributions and their proof.       |
| 84–90s | Deployed URL and close                 | “A Mobbin-like discovery layer feeds an evidence loop—not another generic node editor.”   |

Keep the cursor moving and narration literal. Do not spend video time on architecture, future features, or unsourced market claims.

## 5. Final capture checklist

- [ ] Record the deployed build, not a local-only state.
- [ ] Open a fresh private window and run the complete path once.
- [ ] Keep the Returnal source link available, but do not navigate away during the take.
- [ ] Show the deterministic/no-model-call label if the legacy graph screen appears.
- [ ] State that demo tester data is local-only and not durable external evidence.
- [ ] Show one recorded decision after the limitations are visible.
- [ ] Mention two verified Astra contributions from the build log.
- [ ] Export at 1080p with legible text and audible narration.
- [ ] Keep one local copy and one cloud copy before submission.
