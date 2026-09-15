import { DINO_MARIO as C, encounterSize, dinoPlayerSize, type DinoMarioState } from '../demos/dino-mario.ts';

export function drawDino(canvas: HTMLCanvasElement, game: DinoMarioState) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#f7f4e9';
  ctx.fillRect(0, 0, C.width, C.height);
  ctx.strokeStyle = '#e2dfd2';
  ctx.lineWidth = 1;
  for (let x = 0; x < C.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, C.ground);
    ctx.stroke();
  }
  for (let y = 18; y < C.ground; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(C.width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#384c3f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, C.ground);
  ctx.lineTo(C.width, C.ground);
  ctx.stroke();
  ctx.fillStyle = '#d5d2c3';
  for (let x = -((game.tick * C.speed) % 64); x < C.width; x += 64)
    ctx.fillRect(x, C.ground + 13, 18, 2);
  for (const e of game.encounters) {
    const size = encounterSize(e.kind),
      y = C.ground - size.height;
    if (e.x > C.width) continue;
    if (e.kind === 'block') {
      ctx.fillStyle = '#b72e32';
      ctx.fillRect(e.x, y + 25, size.width, 13);
      ctx.beginPath();
      ctx.moveTo(e.x, y + 25);
      ctx.lineTo(e.x + 7, y);
      ctx.lineTo(e.x + 14, y + 25);
      ctx.lineTo(e.x + 21, y);
      ctx.lineTo(e.x + 28, y + 25);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe16a';
      ctx.fillRect(e.x + 4, y + 29, 7, 4);
      ctx.fillRect(e.x + 18, y + 29, 7, 4);
    } else if (e.kind === 'meat') {
      ctx.fillStyle = '#fff4df';
      ctx.fillRect(e.x + 2, y + 14, 15, 5);
      ctx.fillRect(e.x, y + 11, 5, 11);
      ctx.fillStyle = '#b65b32';
      ctx.beginPath();
      ctx.ellipse(e.x + 16, y + 10, 9, 10, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2ab68';
      ctx.fillRect(e.x + 13, y + 4, 4, 6);
    } else {
      ctx.fillStyle = '#79648b';
      ctx.fillRect(e.x + 5, y, 20, 5);
      ctx.fillRect(e.x, y + 5, size.width, 17);
      ctx.fillRect(e.x + 3, y + 22, 8, 6);
      ctx.fillRect(e.x + 19, y + 22, 8, 6);
      ctx.fillStyle = '#f7f4e9';
      ctx.fillRect(e.x + 7, y + 9, 4, 4);
      ctx.fillRect(e.x + 19, y + 9, 4, 4);
    }
  }
  const size = dinoPlayerSize(game);
  const x = C.playerX, y = game.feet - size.height;
  const stride = game.status === 'playing' && game.feet >= C.ground
    ? Math.sin(game.tick * Math.PI / 6) : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size.width / C.playerWidth, size.height / C.playerHeight);
  ctx.globalAlpha = game.protection > 0 && Math.floor(game.tick / 5) % 2 ? 0.4 : 1;
  ctx.fillStyle = game.status === 'lost' ? '#a14c3b' : game.big ? '#315d3d' : '#456850';
  const bob = Math.abs(stride) * 2;
  ctx.fillRect(8, bob, 20, 18);
  ctx.fillRect(2, 14 + bob, 19, 18);
  ctx.fillRect(-7, 20 + bob, 12, 6);
  ctx.fillRect(-11, 16 + bob, 5, 7);
  ctx.fillRect(18, 21 + bob, 8, 4);
  ctx.fillRect(2 + stride * 5, 29, 6, 7 + Math.max(0, stride) * 4);
  ctx.fillRect(1 + stride * 7, 34 + Math.max(0, stride) * 3, 11, 3);
  ctx.fillRect(14 - stride * 5, 29, 6, 7 + Math.max(0, -stride) * 4);
  ctx.fillRect(13 - stride * 7, 34 + Math.max(0, -stride) * 3, 11, 3);
  ctx.fillStyle = '#f7f4e9';
  ctx.fillRect(20, 5 + bob, 4, 4);
  ctx.restore();
  const finishX = C.playerX + (C.finishTick - game.tick) * C.speed;
  if (finishX < C.width) {
    ctx.fillStyle = '#456850';
    ctx.fillRect(finishX, C.ground - 85, 3, 85);
    ctx.fillRect(finishX, C.ground - 85, 30, 18);
  }
}

