# Image exploration prompts and provenance

Built-in `image_gen.imagegen` was used for both visual explorations. Its text result did not expose a model selector or certified GPT-6 model identity. These are build-time images, not generated gameplay. The working card table uses original SVG/CSS/JS assets. The generator introduced small unrequested decorative copy; that copy was not adopted as a product requirement.

## Typography exploration

Output: `assets/typography-exploration.png`. No input images. Intended use: card typography and visual hierarchy exploration.

```text
Use case: ui-mockup
Asset type: visual direction board for the Forge browser party-game concept-card component, issue PC-04.
Primary request: Typography-heavy cards with the immediate confidence and legibility of Cards Against Humanity, but original Forge identity. No illustrations on card fronts. Create a precise polished flat UI design board, landscape, warm off-white background and black typography, one acid-yellow selected-card accent. Oversized heavy grotesk type, tight line spacing, ample whitespace, gently rounded rectangular cards, discreet folio numbers and tiny uppercase labels. Refined Swiss editorial hierarchy. Not a photo, no perspective distortion.
Composition: small top masthead "FORGE / THE OPEN DECK", then large heading "Big ideas. Small cards." and subtitle "Pick a concept. Make something strange." A row of five equal tall cards with generous inner margins: four concept cards and one dark blank concept card. Below, a restrained strip showing how a selected card opens a mini demo.
Cards text verbatim:
1: small "01 / CONCEPT"; large title "Jump\nQuest."; body "Reach the goal. Time your jumps. Mind the gaps."; footer "Show me ↗" and "Swap card".
2: small "02 / CONCEPT"; large title "Growing\nTrail."; body "Collect to grow. Your own trail becomes the obstacle."; footer "Show me ↗" and "Swap card". Acid yellow selected outline and small text "Selected".
3: small "03 / CONCEPT"; large title "Fixed-Order\nRush."; body "Read the order. Follow the steps. Deliver before time runs out."; footer "Show me ↗" and "Swap card".
4: small "04 / CONCEPT"; large title "Bid & Take\nTricks."; body "Name your target. Follow suit. Win the trick."; footer "Show me ↗" and "Swap card".
5: charcoal black card, white type; small "YOUR WILD IDEA"; large title "Your\nown\nidea."; body "What if the game could…"; bottom label "Concept only · unavailable in demo". No action implying submission.
Below cards: small section heading "IF THE IDEA DOESN'T CLICK." with a small monochrome top-down growing-trail board, bright yellow square pickup, simple geometric snake path, and beside it "See it. Then choose." / "A tiny explainer, one rule at a time." / "Illustrative demo". Minimal clean game diagram confined to this area.
Constraints: accurate readable text, original wordmark, no copied logos, no commercial-game characters, no card art, no fantasy frame, no shiny trading-card effects, no gradients. No claims of live multiplayer, generated gameplay or model identity. Excellent optical spacing and finished product-design quality.
```

## Restrained shared-world exploration

Output: `assets/shared-world-exploration.png`. References: the user's attached `codex-clipboard-3776273a-5461-49c7-bbd9-5932b8b32dac.png` (world composition) and the first generated typography board (card treatment). Intended use: reconcile the world with the accepted minimalist cards; not a runtime asset.

```text
Use case: ui-mockup
Asset type: high-fidelity browser interface design for Chaotic Forge, a collaborative game concept-card table.
Input images: Image 1 is a visual reference for the shared floating world, three people, contribution list and hand of cards. Image 2 is the accepted typography-first card design reference.
Primary request: Create a beautiful MIDDLE GROUND between these two references. Preserve reference 2's restrained, confident oversized black grotesk typography and warm ivory cards. Bring in reference 1's delightful shared world, but distilled into one small original sculptural diorama floating in a vast clean ivory stage. Add an obvious 2D / 3D segmented view toggle with 3D active. The visual world is a conceptual mashup, not a verified generated game.
Style: minimalist editorial product design meets carefully art-directed matte clay / paper 3D miniature. Warm ivory canvas, ink black text, restrained pale sage terrain, soft lavender tiny towers, muted orange flags, acid-yellow selection accent. Gentle ambient shadows. Crisp UI grid, ample whitespace. NO fantasy tavern backdrop, distressed parchment, ornate frames, neon glow, wooden table, decorative props or large art on card faces.
Composition: complete landscape desktop screen, approximately 1536x1024. Header at top with compact two-line heavy "CHAOTIC FORGE" wordmark at left, small "THE SHARED TABLE" in center, "Design study" on right. Upper half: a large clean shared-world stage about three quarters width, narrow editorial contributions column at right separated by thin vertical line. On stage top left big text "A little strange.\nEntirely ours." and below small "Different ideas. One shared world." Put 2D / 3D toggle at top right of stage. Center stage has a compelling low-poly miniature isometric square island with one looping raised route, a few geometric tower blocks, a tiny abstract kitchen station and three playing-card monoliths marked with simple geometric suit symbols. Delicate lightly extruded base and soft shadow make depth legible. Not hyperreal, very restrained color, mostly ivory. Three small participant chips under stage, "Kahhow · choosing", "Mira · choosing", "Lance · choosing"; circle avatars are single letters, no roles or assigned genres. Small caption "Illustrative world preview".
Right column title "Our game" then small label "EXAMPLE CONTRIBUTIONS" and three spacious typographic rows "01 Tower defence", "02 Pocket poker", "03 Order rush"; bottom a fine dashed placeholder "Your contribution goes here". No approval, ready, online or generated badges.
Lower half: strong heading "Any card. Any player." with small helper "Choose an idea. Swap anything that doesn't click." Four typographic concept cards plus one black custom card, equal widths, upright not tilted. Cards have huge flush-left bold type taking about half of face, small plain-language effect, tiny footer actions "Show me ↗" and "Swap". Warm white surface, thin soft border, 10px corners, subtle shadows. No large image thumbnails.
Card 1 title "First-person\naim." body "See through your character's eyes. Point. Fire."
Card 2 title "Pocket\npoker." body "Make a better hand from what you have."
Card 3 title "Build the\ndefence." body "Place defences. Stop the incoming wave." selected, acid yellow background, word "Selected" on small top line.
Card 4 title "Order\nrush." body "Follow the order. Deliver before time runs out."
Card 5 black with white large title "Your own\nidea." body "What if the game could…" and persistent small label "Concept only · unavailable in demo".
Bottom compact dark button "Preview contribution →", adjacent small "Local design study".
Constraints: all text legible and correctly spelled, all imagery original, no logo copying, no copyrighted characters, no trading-card fantasy ornament. Keep cards and interface 2D while the shared miniature is 3D. The toggle affects the shared-world presentation, not whether cards are enabled and not a player's contribution type. Produce a finished cohesive UI mockup, no outer browser chrome or annotations.
```
