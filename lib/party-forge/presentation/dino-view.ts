import {
  DINO_MARIO as C,
  encounterSize,
  dinoPlayerSize,
  type DinoMarioState,
  createDinoMarioGame,
} from '../demos/dino-mario.ts';

export type DinoSprites = { meat: HTMLImageElement; pterodactyl: HTMLImageElement };
export const DINO_SPRITE_PATHS = {
  meat: '/party-forge/dino/meat-v1.png',
  pterodactyl: '/party-forge/dino/pterodactyl-v1.png',
};

export function drawDino(
  canvas: HTMLCanvasElement,
  game: DinoMarioState,
  distance = game.tick * C.speed,
  finishDistance = C.finishTick * C.speed,
  sprites?: DinoSprites,
) {
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
  for (let x = -(distance % 64); x < C.width; x += 64)
    ctx.fillRect(x, C.ground + 13, 18, 2);
  for (const e of game.encounters) {
    const size = encounterSize(e.kind),
      y = C.ground - (e.altitude ?? 0) - size.height;
    if (e.x > C.width) continue;
    if (e.kind === 'block') {
      drawDinoSpike(ctx, e.x, y);
    } else if (e.kind === 'meat') {
      drawDinoMeat(ctx, e.x, y, sprites);
    } else if (e.motion && sprites) {
      drawPterodactyl(ctx, e.x, y, e.motion, game.tick, sprites);
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
  if ((game.beamTicks ?? 0) > 0) drawDinoBeam(ctx, game);
  drawDinoPlayer(ctx, game, C.playerX, game.feet, sprites);
  const finishX = C.playerX + finishDistance - distance;
  if (finishX < C.width) {
    ctx.fillStyle = '#456850';
    ctx.fillRect(finishX, C.ground - 85, 3, 85);
    ctx.fillRect(finishX, C.ground - 85, 30, 18);
  }
}

/** One sprite shared by the course and its legend. */
export function drawDinoSpike(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
) {
  ctx.fillStyle = '#b72e32';
  ctx.fillRect(x, y + 25, 28, 13);
  ctx.beginPath();
  ctx.moveTo(x, y + 25);
  ctx.lineTo(x + 7, y);
  ctx.lineTo(x + 14, y + 25);
  ctx.lineTo(x + 21, y);
  ctx.lineTo(x + 28, y + 25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe16a';
  ctx.fillRect(x + 4, y + 29, 7, 4);
  ctx.fillRect(x + 18, y + 29, 7, 4);
}

export function drawDinoPlayer(
  ctx: CanvasRenderingContext2D,
  game: DinoMarioState,
  x: number,
  feet: number,
  _sprites?: DinoSprites,
) {
  const size = dinoPlayerSize(game);
  const y = feet - size.height;
  const stride =
    game.status === 'playing' && game.feet >= C.ground
      ? Math.sin((game.tick * Math.PI) / 6)
      : 0;
  if (game.growth === 2) {
    // Native block geometry matches the original Dino's flat arcade style.
    const rows = [
      '                 #######',
      '                 #######',
      '             #  ########',
      '           # ###########',
      '          ############',
      '        # ##############',
      '       #################',
      '     # #############',
      '#   ##################',
      '## #################',
      ' ##################',
      '   ###############',
    ];
    const left = x - 32;
    ctx.save();
    ctx.globalAlpha = game.protection > 0 && Math.floor(game.tick / 5) % 2 ? 0.4 : 1;
    ctx.fillStyle = game.status === 'lost' ? '#a14c3b' : '#315d3d';
    rows.forEach((row, r) => {
      for (let col = 0; col < row.length; col++)
        if (row[col] === '#') ctx.fillRect(left + col * 4, y + r * 4, 4, 4);
    });
    ctx.fillRect(left + 40 + stride * 4, y + 48, 12, 12 - Math.max(0, stride) * 4);
    ctx.fillRect(left + 40 + stride * 6, y + 60 - Math.max(0, stride) * 4, 16, 4);
    ctx.fillRect(left + 64 - stride * 4, y + 48, 12, 12 - Math.max(0, -stride) * 4);
    ctx.fillRect(left + 64 - stride * 6, y + 60 - Math.max(0, -stride) * 4, 16, 4);
    ctx.fillStyle = '#f7f4e9';
    ctx.fillRect(left + 84, y + 4, 4, 4);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size.width / C.playerWidth, size.height / C.playerHeight);
  ctx.globalAlpha =
    game.protection > 0 && Math.floor(game.tick / 5) % 2 ? 0.4 : 1;
  ctx.fillStyle =
    game.status === 'lost' ? '#a14c3b' : game.big ? '#315d3d' : '#456850';
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
}
export function drawDinoMeat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sprites?: DinoSprites,
) {
  if (!sprites) {
    // Keep the original retained-party pickup visible without demo asset loading.
    ctx.fillStyle = '#fff4df'; ctx.fillRect(x + 2, y + 14, 15, 5); ctx.fillRect(x, y + 11, 5, 11);
    ctx.fillStyle = '#b65b32'; ctx.beginPath(); ctx.ellipse(x + 16, y + 10, 9, 10, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2ab68'; ctx.fillRect(x + 13, y + 4, 4, 6);
    return;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprites.meat, x, y, 24, 24);
  ctx.restore();
}
export function drawDinoGrowthPreview(
  canvas: HTMLCanvasElement,
  sprites: DinoSprites,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#384c3f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 145);
  ctx.lineTo(600, 145);
  ctx.stroke();
  const base = createDinoMarioGame();
  drawDinoPlayer(ctx, { ...base, growth: 0 }, 45, 145, sprites);
  drawDinoPlayer(ctx, { ...base, growth: 1, big: true }, 255, 145, sprites);
  drawDinoPlayer(ctx, { ...base, growth: 2, big: true }, 470, 145, sprites);
  drawDinoMeat(ctx, 153, 108, sprites);
  drawDinoMeat(ctx, 369, 108, sprites);
  drawDinoSpike(ctx, 563, 107);
  drawPterodactyl(ctx, 310, 38, 'fly', 0, sprites);
  ctx.fillStyle = '#384c3f';
  ctx.font = '12px monospace';
  ctx.fillText('START', 40, 170);
  ctx.fillText('GROW ONCE', 230, 170);
  ctx.fillText('GROW TWICE', 450, 170);
  ctx.fillText('→', 190, 120);
  ctx.fillText('→', 405, 120);
}

/** Broad forward blast matches the ground corridor cleared by the simulation. */
function drawDinoBeam(ctx: CanvasRenderingContext2D, game: DinoMarioState) {
  const size = dinoPlayerSize(game);
  const x = C.playerX + size.width;
  const top = Math.min(C.ground - 52, game.feet - size.height + 12);
  const pulse = Math.sin(game.tick / 10) * 3;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 25, 38, 0.15)'; ctx.fillRect(0, 0, C.width, C.height);
  ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 22;
  ctx.fillStyle = 'rgba(34, 211, 238, 0.65)';
  ctx.fillRect(x, top - 7, C.width - x, C.ground - top + 7);
  ctx.shadowBlur = 0; ctx.fillStyle = '#baf8ff';
  ctx.beginPath(); ctx.moveTo(x, top + 10); ctx.lineTo(C.width, top + pulse);
  ctx.lineTo(C.width, C.ground); ctx.lineTo(x, C.ground - 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fffde5'; ctx.fillRect(x, top + 14, C.width - x, Math.max(10, C.ground - top - 24));
  ctx.strokeStyle = '#53d3eb'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const y = top + 10 + i * (C.ground - top - 12) / 4;
    ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(C.width, y + pulse); ctx.stroke();
  }
  ctx.fillStyle = '#123b48'; ctx.font = 'bold 16px monospace';
  ctx.fillText('ATOMIC BEAM', x + 22, Math.max(24, top - 18));
  ctx.restore();
}

/** Shared left-facing sprite cycle for live enemies and the instruction legend. */
export function drawPterodactyl(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  motion: 'crawl' | 'fly', tick: number, sprites: DinoSprites,
) {
  const image = sprites.pterodactyl;
  const cellWidth = image.naturalWidth / 4;
  const cellHeight = image.naturalHeight / 2;
  const frame = Math.floor(tick / (motion === 'fly' ? 7 : 6)) % 4;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, frame * cellWidth, motion === 'fly' ? 0 : cellHeight,
    cellWidth, cellHeight, x - 12, y - (motion === 'crawl' ? 12 : 18), 56, 56);
  ctx.restore();
}
