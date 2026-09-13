# ModeShift — 90-second demo runbook

Run at 1280×720 or larger. Press `H` first if you want the panels hidden for a
clean capture, then `H` again — the panels are part of the pitch.

**Before recording:** load the page, press `R`, and leave the prompt at its
prefilled value. Do not press anything else; the run must start from `READY`, in
**Inhabit**, with Focus at 100%. If pointer lock is refused by the host, the HUD
switches to drag-to-look — drag instead, the run is identical.

| Time | Content | Exact actions |
| --- | --- | --- |
| 0:00–0:08 | Problem and promise | Hold on the title. "Three camera angles over one world is a preference, not a mechanic. If every view can walk to the objective, switching is decoration." |
| 0:08–0:18 | Design intent and structured proposal | Click **Ask Astra**. Read the hypothesis: the governing rule, the predicted behaviour, the primary metric (`Focus remaining ≥ 30%`), the fairness risk. Say plainly that today's proposal is local and deterministic. |
| 0:18–0:32 | The impossible gap | You start in **Inhabit**. Walk to the lip of the void and drag-look across it. "Ten metres. A full-speed jump reaches seven. And those three slabs are real — they are just at three different depths and three different heights. That is not a path." |
| 0:32–0:48 | **The hero beat** — forging the span | Press `1`. Let the camera pull out to the side and watch the three slabs slide into one plane and light up. "Depth just collapsed. Those surfaces align in this projection, so they are connected while it holds." Point at the Focus meter starting to drain. |
| 0:48–1:00 | Cross, and pay for it | Run right across the span — core 1 is sitting over nothing. Land on the far lip and press `2`. "The span stops being solid the moment I stop projecting." Note the Focus number you spent. |
| 1:00–1:10 | Inhabit earns the second core | Walk right to the facade, into the corridor in depth, take **core 2**. "Same world, same position, same clock. Inhabit is the only mode that can pick anything up." |
| 1:10–1:20 | Command freezes the world | Press `3`. "Time is at zero — the clock, the sentry, the exposure counter. I can plan inside the hazard field and it cannot touch me. It also cannot take the core for me." Press `2`, take **core 3** off the pedestal. |
| 1:20–1:30 | Portal, metrics, close | Press `1`, run right, jump onto the portal deck, enter the ring. Read the results: Focus remaining against the predicted `≥ 30%`, the honest `HELD` / `MISSED`, and **time per perspective**. "That last bar is the whole thesis — Focus is what stops one version of the world from winning." |

### If you have 15 more seconds

Stand mid-span and just wait. Focus hits zero, the span stops existing, and the
fall drops you back onto **real** ground — never into the void it was spanning,
because a projected surface is never recorded as a safe respawn. That is the
fairness risk from the hypothesis panel, demonstrated rather than claimed.

## The art-direction beat

If the pitch is about art rather than mechanics, run the style keys as their own
30 seconds. The point lands hardest in this order:

1. `4` **Obsidian Lab** — the shaded-primitive baseline.
2. `6` **Cel Ink** — proof that the *renderer* is a real lever: same boxes,
   different shading model and outlines.
3. `7` **Pixel Grove** — the moment the argument changes. Nothing about the
   renderer moved; the boxes are wearing an authored tileset, the player is a
   sprite, and the sky is three parallax bands.
4. `8` **Block Bits** — the same collision boxes diced into 1,188 instanced
   voxel blocks.

Say the line that matters: switching engines would not have produced any of
this. Assets did.

## Fallback if something goes wrong

- Pointer lock refused → the HUD switches to "drag the world to look"; drag instead.
- Lost in the world → press `R`; it resets position, cores, timer, Focus and metrics.
- A fall → it costs position only, not cores or elapsed time. Keep going.
- Focus at zero and stuck → stand still on real ground in **Inhabit**; it trickles
  back at 4%/s, so no run can dead-end. Collecting a core pays back 25%.
- The span did not appear → you are out of Focus. The meter reads `COLLAPSED` and
  no projection will solidify until it recovers.
