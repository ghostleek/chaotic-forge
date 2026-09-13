/**
 * Chaotic Forge / PC-04 — reusable, original vector illustration.
 * Both projections share the same world coordinates. This is an illustrative
 * selection-table asset, never a preview of generated or executable gameplay.
 * No dependencies, model calls, timers, remote files, or hidden state.
 */
export function worldSvg(view = "3d", contributionCount = 0) {
  const flat = view === "2d";
  const count = Math.max(0, Math.min(4, Math.floor(Number(contributionCount) || 0)));
  const palette = {
    ink: "#454b40", grass: "#dce2ce", grid: "#c9d2bb", ivory: "#f6f2e6",
    slab: "#d3cdbd", edge: "#bdb8a8", route: "#f7f2dd", routeEdge: "#d0d5bf",
    lavender: "#afa6d2", lavenderTop: "#d2c9eb", lavenderShade: "#9086b6",
    orange: "#d88960", orangeTop: "#eaa780", orangeShade: "#b97351", acid: "#dcf46a",
  };
  const p = (x, y, z = 0) => flat
    ? [138 + x * 1.34, 52 + y * 1.18]
    : [330 + (x - y) * 1.03, 87 + (x + y) * 0.45 - z * 0.95];
  const coords = (points) => points.map((xyz) => p(...xyz).map((n) => n.toFixed(1)).join(",")).join(" ");
  const polygon = (points, fill, extra = "") => `<polygon points="${coords(points)}" fill="${fill}" ${extra}/>`;
  const line = (a, b, color, width = 1, extra = "") => {
    const [x1, y1] = p(...a); const [x2, y2] = p(...b);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
  };
  const block = (x, y, w, d, h, top, front, side, base = 0) => [
    !flat && polygon([[x, y + d, base], [x + w, y + d, base], [x + w, y + d, h], [x, y + d, h]], front),
    !flat && polygon([[x + w, y, base], [x + w, y + d, base], [x + w, y + d, h], [x + w, y, h]], side),
    polygon([[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]], top),
  ].filter(Boolean).join("");
  const groundTransform = flat ? "matrix(1.34 0 0 1.18 138 52)" : "matrix(1.03 .45 -1.03 .45 330 87)";
  const ground = [[0, 20], [20, 0], [340, 0], [360, 20], [360, 230], [340, 250], [20, 250], [0, 230]];
  const pieces = [];

  // The platform uses real geometry, including its chamfered edge; no texture.
  pieces.push(`<ellipse cx="380" cy="${flat ? 363 : 373}" rx="${flat ? 230 : 261}" ry="${flat ? 12 : 23}" fill="#b6bbac" opacity=".12"/>`);
  if (!flat) {
    for (let i = 3; i < 7; i += 1) {
      const a = ground[i]; const b = ground[i + 1];
      pieces.push(polygon([[...a, 0], [...b, 0], [...b, -22], [...a, -22]], i < 5 ? palette.slab : palette.edge));
      pieces.push(line([...a, -7], [...b, -7], "#ebe6d8", 1));
    }
  }
  pieces.push(polygon(ground, palette.grass, `stroke="${palette.grid}" stroke-width="1.2"`));
  pieces.push(`<g transform="${groundTransform}" fill="none" stroke="${palette.grid}" stroke-width=".7" opacity=".78">`);
  for (let x = 30; x < 360; x += 30) pieces.push(`<path d="M${x} 12V238"/>`);
  for (let y = 30; y < 250; y += 30) pieces.push(`<path d="M12 ${y}H348"/>`);
  pieces.push("</g>");

  const route = "M28 194H57V102Q57 78 81 78H119V43H259Q285 43 285 69V189Q285 212 262 212H161Q139 212 139 190V154";
  pieces.push(`<g transform="${groundTransform}" stroke-linejoin="round" stroke-linecap="round"><path d="${route}" fill="none" stroke="${palette.routeEdge}" stroke-width="22"/><path d="${route}" fill="none" stroke="${palette.route}" stroke-width="17"/><circle cx="28" cy="194" r="5" fill="${palette.orange}"/><circle cx="139" cy="154" r="5" fill="${palette.lavenderShade}"/></g>`);

  // Small, low-cut terrain blocks make the plan view as considered as the model.
  for (const [x, y, w, d] of [[27, 28, 39, 25], [302, 33, 28, 44], [173, 224, 55, 10]]) {
    pieces.push(block(x, y, w, d, 5, "#bdcbaa", "#a9b997", "#b2c19e"));
  }

  const tower = (x, y, h) => {
    let result = block(x - 7, y - 7, 40, 40, 7, "#c2badb", "#a59cbe", "#ada3c6");
    result += block(x, y, 26, 26, h, palette.lavenderTop, palette.lavender, palette.lavenderShade, 7);
    result += block(x - 4, y - 4, 34, 34, h + 6, "#d9d1ec", "#bcb2d6", "#a296c4", h - 1);
    for (const [dx, dy] of [[-4, -4], [21, -4], [-4, 21], [21, 21]]) {
      result += block(x + dx, y + dy, 9, 9, h + 15, palette.lavenderTop, palette.lavender, palette.lavenderShade, h + 6);
    }
    if (!flat) result += polygon([[x + 10, y + 26, 27], [x + 16, y + 26, 27], [x + 16, y + 26, 43], [x + 10, y + 26, 43]], "#827899");
    else result += polygon([[x + 7, y + 7], [x + 19, y + 7], [x + 19, y + 19], [x + 7, y + 19]], "#9589b3");
    return result;
  };

  // Kitchen pavilion: a matte gabled roof, open counter, and a tiny order tile.
  const kitchen = () => {
    const x = 172; const y = 88; const w = 62; const d = 46;
    let result = block(x - 5, y - 5, w + 10, d + 13, 5, "#e3d4b7", "#c5b699", "#d1c3a8");
    result += block(x, y, w, d, 39, "#e9b489", "#e6a276", palette.orangeShade, 5);
    if (!flat) {
      result += polygon([[x + 9, y + d, 15], [x + 53, y + d, 15], [x + 53, y + d, 32], [x + 9, y + d, 32]], "#745b48");
      result += block(x + 6, y + d, 50, 7, 16, palette.ivory, "#d2c7b1", "#c4b69d", 12);
    }
    result += polygon([[x - 6, y - 6, 39], [x + w + 6, y - 6, 39], [x + w + 6, y + d / 2, 66], [x - 6, y + d / 2, 66]], palette.orangeTop);
    result += polygon([[x - 6, y + d / 2, 66], [x + w + 6, y + d / 2, 66], [x + w + 6, y + d + 6, 39], [x - 6, y + d + 6, 39]], palette.orange);
    result += line([x - 6, y + d / 2, 66], [x + w + 6, y + d / 2, 66], "#efbd99", 1.5);
    if (flat) result += `<g transform="${groundTransform}"><rect x="${x + 24}" y="${y + 15}" width="14" height="18" rx="2" fill="${palette.ivory}"/><path d="M${x + 28} ${y + 21}h6m-6 5h6" stroke="${palette.orangeShade}" stroke-width="1.4"/></g>`;
    return result;
  };

  // The cards are freestanding, geometric monoliths, with original suit marks.
  const monolith = (x, y, suit, h) => {
    let result = block(x - 4, y - 4, 37, 19, 4, "#c5ceb8", "#acb8a0", "#b7c2aa");
    result += block(x, y, 29, 10, h, palette.ivory, "#f1edde", "#d8d3c3", 4);
    if (flat) {
      return result + `<g transform="${groundTransform}"><path d="M${x + 14.5} ${y + 1}l5 4-5 4-5-4Z" fill="${suit === "diamond" ? palette.orange : palette.ink}"/></g>`;
    }
    const face = (u, v) => [x + u, y + 10, v];
    const center = h * 0.58;
    if (suit === "diamond") result += polygon([face(14.5, center + 11), face(23, center), face(14.5, center - 11), face(6, center)], palette.orange);
    else if (suit === "spade") {
      result += polygon([face(14.5, center + 12), face(24, center - 2), face(20, center - 6), face(9, center - 6), face(5, center - 2)], palette.ink);
      result += polygon([face(13, center - 5), face(16, center - 5), face(19, center - 11), face(10, center - 11)], palette.ink);
    } else {
      result += polygon([face(6, center + 9), face(13, center + 9), face(14.5, center + 6), face(17, center + 9), face(23, center + 9), face(25, center + 3), face(14.5, center - 11), face(4, center + 3)], palette.lavenderShade);
    }
    result += line(face(5, h - 8), face(10, h - 8), "#8b8c7a", 1.5);
    return result;
  };

  // Back to front painter order is fixed and shared by both projections.
  pieces.push(tower(86, 21, 58));
  pieces.push(kitchen());
  pieces.push(monolith(309, 95, "spade", 55));
  pieces.push(monolith(309, 124, "diamond", 48));
  pieces.push(monolith(309, 153, "heart", 41));
  pieces.push(tower(84, 139, 72));

  for (let i = 0; i < count; i += 1) {
    pieces.push(block(181 + i * 26, 165, 19, 19, 7, palette.acid, "#b5c952", "#c4da5c"));
    pieces.push(line([185 + i * 26, 174, 7], [188 + i * 26, 177, 7], palette.ink, 1.5));
    pieces.push(line([188 + i * 26, 177, 7], [195 + i * 26, 169, 7], palette.ink, 1.5));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 430" role="img" aria-label="Illustrative shared world, ${flat ? "2D top-down" : "3D axonometric"} view" class="forge-world-svg" width="760" height="430"><title>Illustrative shared world</title><desc>Original vector concept scene with two lavender towers, an orange kitchen pavilion, three playing-card monoliths, and a looping path. ${count} decorative contribution tiles. This illustration does not represent a generated or playable game. Switching perspective changes presentation only.</desc><g stroke-linejoin="round">${pieces.join("")}</g></svg>`;
}
