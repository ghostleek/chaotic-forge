# Kitchen Chaos presentation assets

PC-05 adds a procedural first-person presentation for the retained authored
`kitchen-chaos-v1` demo. The source is
`lib/party-forge/presentation/kitchen-view.ts`; it requires no downloaded art,
image model, font service, texture, or rendering library. The renderer and its
palette are original code authored in this repository by Codex for Kahhow.
No external image license or generated-image provenance is claimed.

**Source:** the immutable retained runtime exports `WORLD`, `RULES`, and the
snapshot consumed through `KitchenPartySnapshot`. Its room boundaries, counter
collision dimensions, eye height, camera angles, entities, cooking deadlines,
carried items, and active additions determine what is drawn.

**Forge interpretation:** a warm tiled kitchen, mint station markers, coral
obstruction, simple cylindrical zombies, ingredient parcels, and a plate/blaster
illustration make the mechanics legible. These colors and shapes are presentation
choices. They do not add collision geometry, simulation events, extra time, or
score. Surface markings are paint; station labels are interface annotations.

**User decision:** the PC-04 hand follows one deterministic authored recipe,
and the room is capped at three participants. PC-05 makes that retained recipe
playable in the first person. It does not introduce generated gameplay or
restore the removed whole-site 2D/3D toggle.

The renderer has a 480 × 300 maximum software surface and a perspective depth
buffer. Pitch and yaw follow the retained engine convention, including up/down
aim. Counter faces occlude enemies and drops. Station markers use the actual
interaction positions; cooking progress uses the actual ready tick. Carried
Hot Potato time, Dinner Bell rings, Zombie Pantry drops, stun color, contact
feedback, and shot feedback derive only from snapshot fields. The function has
no input listeners, timers, animation loop, runtime owner, or scoring routine.

PC-02's retained executable and build manifest remain unchanged. This procedural
view is bundled application code, not a new manifest asset or a claim that a
versioned art archive has been published. Old executable/art versions must remain
available if later saved manifests acquire separate asset references; changing
this view must never replace the retained engine bytes.

The user's request pauses test execution for this stack. This document records
implementation provenance, not passed browser, performance, or quality gates.
