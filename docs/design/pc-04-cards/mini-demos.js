// Original authored explanations. No game engine, room state, or model calls.
const ink = '#252c24', sage = '#c9d9b7', acid = '#e8f36b', purple = '#cab9df';
const rect = (x, y, w, h, fill = sage) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${ink}" stroke-width="1.5"/>`;
const text = (x, y, value, size = 15) => `<text x="${x}" y="${y}" fill="${ink}" font-family="Arial,sans-serif" font-size="${size}" text-anchor="middle">${value}</text>`;
const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="12" fill="${ink}"/><circle cx="${x + 3}" cy="${y - 3}" r="3" fill="white"/>`;
const card = (x, y, value, active = false) => rect(x, y, 60, 82, active ? acid : '#fffefa') + text(x + 30, y + 49, value, 24);
const definitions = {
  'jump-quest': {
    steps: ['Reach the flag across three platforms. The spaces between them are gaps.', 'Jump from the first platform. The arc carries you across the gap.', 'Land on the middle platform before jumping again.', 'Reach the flag. Timing your jumps is the central idea.'],
    draw: (step) => rect(35, 150, 100, 20) + rect(215, 125, 100, 20) + rect(395, 100, 110, 20) + `<path d="M85 130 Q175 0 265 105 M265 105 Q355 0 445 80" fill="none" stroke="${step ? '#788667' : '#b7bfae'}" stroke-width="2" stroke-dasharray="5 6"/><path d="M480 100V40l26 10-26 10" fill="${acid}" stroke="${ink}"/>` + dot(...[[85, 137], [170, 53], [265, 112], [445, 87]][step]),
  },
  'growing-trail': {
    steps: ['The dark trail follows your head. Move toward the yellow pickup.', 'Collect the pickup. It adds one segment to your trail.', 'Turn into open space. Your longer trail now blocks more of the board.', 'Avoid crossing yourself. A route that worked before may now be blocked.'],
    draw: (step) => {
      const paths = [ [[2,3],[3,3],[4,3]], [[2,3],[3,3],[4,3],[5,3]], [[3,3],[4,3],[5,3],[5,2]], [[4,3],[5,3],[5,2],[4,2]] ];
      return Array.from({length: 40}, (_, i) => rect(75+(i%8)*47, 20+Math.floor(i/8)*34, 42, 29, '#f2f3eb')).join('') + paths[step].map(([x,y]) => rect(75+x*47,20+y*34,42,29,ink)).join('') + (step === 0 ? rect(310,122,42,29,acid) : '') + (step === 3 ? `<path d="M284 105v24m-7-7 7 7 7-7" fill="none" stroke="#a44636" stroke-width="3"/>` : '');
    },
  },
  'fixed-order-rush': {
    steps: ['The order specifies soup: chop, cook, then deliver. A deadline limits the whole sequence.', 'Chop the ingredient first. Skipping a required step does not complete the order.', 'Cook the prepared ingredient. Delivering an uncooked item would be incorrect.', 'Deliver the finished soup before the deadline. Correct sequence and timing both matter.'],
    draw: (step) => text(270, 28, 'ORDER: SOUP · CHOP → COOK → DELIVER', 14) + [90,240,390].map((x,i) => rect(x-40,65,110,80,step > i ? acid : '#fffefa') + text(x+15,112,['CHOP','COOK','DELIVER'][i],14)).join('') + `<path d="M165 105h25m125 0h25" stroke="${ink}" stroke-width="2"/>` + rect(50,175,440,12,'#e3e6dc') + rect(50,175,Math.max(35, 400-step*110),12,sage) + text(270,214,'Illustrative deadline • each click advances the explanation',12),
  },
  'pocket-poker': {
    steps: ['Start with five cards. Here, two cards share the same rank: a pair of sevens.', 'Compare the whole hand under a declared ranking rule. The pair is the relevant combination here.', 'Another pair can be stronger: a pair of nines beats a pair of sevens in this simplified comparison.', 'A full game must declare its complete comparison rules and tie breaks. No betting is required by this concept.'],
    draw: (step) => [70,150,230,310,390].map((x,i) => card(x,70, (step >= 2 ? ['9♣','9♦','K♠','5♥','2♣'] : ['7♣','7♦','K♠','5♥','2♣'])[i],i<2)).join('') + text(270,37,step >= 2 ? 'A HIGHER PAIR' : 'SPOT THE PAIR',14) + text(270,194,'Simplified hand comparison · not the full rules of poker',12),
  },
  'bid-take-tricks': {
    steps: ['Four example seats. Before play, a side declares a target number of tricks. Partnerships and scoring need their own rules.', 'North leads a heart. Other seats must follow hearts if they hold them.', 'All four play hearts: 4, 8, queen, 10. In this no-trump example, the highest heart wins.', 'South’s queen wins this trick and leads the next. This four-seat explanation does not establish a three-player adaptation.'],
    draw: (step) => card(240,5,'4♥',step === 1) + card(380,65,'8♥') + card(240,130,'Q♥',step >= 2) + card(100,65,'10♥') + text(325,38,'N',12) + text(470,105,'E',12) + text(325,175,'S',12) + text(72,105,'W',12),
  },
  'flat-world': {
    steps: ['A flat world constrains movement to a plane. Here the plane is shown from above.', 'Move across the plane from left to right.', 'Go around the obstacle on that same plane.', 'The rule constrains movement. A decorative 3D view can still show a game whose movement is flat.'],
    draw: (step) => rect(50,35,440,160,'#e5ebdc') + rect(250,85,60,65,purple) + `<path d="M95 115H205V60H420V115" fill="none" stroke="${ink}" stroke-dasharray="5 5"/>` + dot(...[[95,115],[205,115],[205,60],[420,115]][step]) + text(270,220,'Movement stays on this one plane',13),
  },
  'depth-play': {
    steps: ['A spatial world can give objects meaningful depth.', 'One path passes in front of the block.', 'Another route goes around behind it. Occlusion and camera position must keep the route understandable.', 'The actual game must implement spatial rules and controls. The Forge table toggle only changes an illustration.'],
    draw: (step) => `<path d="M60 135 260 30 490 135 280 215Z" fill="#dbe5cb" stroke="${ink}"/><path d="M235 70 300 95 300 165 235 138Z" fill="#aa99bf" stroke="${ink}"/><path d="M300 95 355 65 355 134 300 165Z" fill="#8f80a6" stroke="${ink}"/><path d="M235 70 290 40 355 65 300 95Z" fill="${purple}" stroke="${ink}"/>` + dot(...[[130,135],[260,175],[380,100],[425,142]][step]),
  },
};

export function mountMiniDemo(container, conceptId) {
  const definition = definitions[conceptId];
  if (!definition) return () => {};
  let step = 0;
  const section = document.createElement('section'); section.className = 'mini-demo';
  section.innerHTML = `<style>.mini-demo{background:#edf0e6;border:1px solid #cbd0bf;border-radius:10px;padding:16px}.mini-demo-label{font:10px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px}.mini-demo svg{display:block;width:100%;height:auto;max-height:230px}.mini-demo-copy{font:14px/1.6 Arial,sans-serif;min-height:68px}.mini-demo-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.mini-demo button{min-height:44px;padding:10px 14px;border:1px solid #69755d;border-radius:6px;background:#fffefa;color:#252c24;font:12px Arial,sans-serif;cursor:pointer}.mini-demo-count{margin-left:auto;font:11px Arial,sans-serif;color:#535e4c}</style><p class="mini-demo-label">Authored concept explainer</p><div class="mini-demo-art"></div><p class="mini-demo-copy" aria-live="polite"></p><div class="mini-demo-controls"><button type="button" class="mini-demo-next">Next step →</button><button type="button" class="mini-demo-replay">Replay explanation ↺</button><span class="mini-demo-count"></span></div>`;
  const draw = () => {
    section.querySelector('.mini-demo-art').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 230" role="img" aria-label="Step ${step + 1} illustration"><rect width="540" height="230" fill="#edf0e6"/>${definition.draw(step)}</svg>`;
    section.querySelector('.mini-demo-copy').textContent = definition.steps[step];
    section.querySelector('.mini-demo-count').textContent = `${step + 1} / ${definition.steps.length}`;
    section.querySelector('.mini-demo-next').disabled = step === definition.steps.length - 1;
  };
  section.querySelector('.mini-demo-next').addEventListener('click', () => { step = Math.min(step + 1,definition.steps.length-1); draw(); });
  section.querySelector('.mini-demo-replay').addEventListener('click', () => { step = 0; draw(); });
  container.append(section); draw();
  return () => section.remove();
}
