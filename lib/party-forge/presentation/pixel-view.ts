import type { PixelSnapshot } from '../runtimes/pixel-arcade-v1/engine.ts';
const alien = ['00100100','00011000','00111100','01111110','11011011','11111111','10100101','00100100'];
export function renderPixel(ctx: CanvasRenderingContext2D, snapshot: PixelSnapshot) {
  const s = snapshot.state;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#141c20'; ctx.fillRect(0, 0, 256, 192);
  ctx.fillStyle = '#283338';
  for (let x = 8; x < 248; x += 8) for (let y = 8; y < 184; y += 8) ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = snapshot.tick < s.flashUntil ? '#ff8576' : '#667269';
  ctx.fillRect(0, 0, 256, 2); ctx.fillRect(0, 190, 256, 2); ctx.fillRect(0, 0, 2, 192); ctx.fillRect(254, 0, 2, 192);
  ctx.fillStyle = '#f4edc9';
  for (const p of s.food) { ctx.fillRect(p.x * 8 + 3, p.y * 8 + 1, 2, 6); ctx.fillRect(p.x * 8 + 1, p.y * 8 + 3, 6, 2); }
  if (s.mode === 'bounce') { ctx.fillStyle='#667269'; for(const p of s.platforms) ctx.fillRect(p.x*8,p.y*8,40,3); }
  s.snake.forEach((p, i) => {
    ctx.fillStyle = s.palette==='pink'?'#ee9eb1':s.palette==='amber'?'#eace7a':i ? '#88b966' : '#c9f589'; ctx.fillRect(Math.round(p.x * 8) + 1, Math.round(p.y * 8) + 1, 6, 6);
    if (!i) { ctx.fillStyle = '#141c20'; ctx.fillRect(p.x * 8 + 2, p.y * 8 + 2, 1, 1); ctx.fillRect(p.x * 8 + 5, p.y * 8 + 2, 1, 1); }
  });
  ctx.fillStyle = '#ff8576';
  for (const p of s.aliens) alien.forEach((row, y) => row.split('').forEach((b, x) => { if (b === '1') ctx.fillRect(p.x * 8 + x, p.y * 8 + y, 1, 1); }));
  for (const p of s.shots) { ctx.fillStyle = p.bounces ? '#eee8c9' : '#a8dce0'; ctx.fillRect(p.x * 8 + 3, p.y * 8 + 3, 2, 2); }
}
