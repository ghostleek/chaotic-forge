import type { KitchenPartySnapshot } from '../runtimes/kitchen-chaos-v1/adapter.ts';
import {
  RULES,
  WORLD,
  type KitchenSnapshot,
} from '../runtimes/kitchen-chaos-v1/retained/engine.js';

type Vec3 = readonly [number, number, number];
type Color = readonly [number, number, number];
type Face = { points: readonly Vec3[]; color: Color };
type Projected = { x: number; y: number; inverseDepth: number };
type Camera = {
  x: number;
  y: number;
  cosYaw: number;
  sinYaw: number;
  cosPitch: number;
  sinPitch: number;
  focal: number;
  width: number;
  height: number;
};
type Surface = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  pixels: ImageData;
  depth: Float32Array;
};

const NEAR = 0.06;
const COLORS = {
  floor: [219, 216, 199],
  grout: [198, 197, 183],
  ceiling: [241, 237, 222],
  wall: [229, 232, 216],
  mint: [164, 190, 166],
  ink: [39, 57, 51],
  coral: [213, 114, 86],
  yellow: [231, 185, 93],
  cream: [248, 237, 204],
  steel: [147, 164, 153],
  zombie: [130, 178, 131],
  apron: [54, 100, 89],
} satisfies Record<string, Color>;
const STATION_NAMES = {
  ingredient: 'INGREDIENTS',
  prep: 'PREP',
  stove: 'COOK',
  delivery: 'SERVE',
};
const STATION_COLORS: readonly Color[] = [
  COLORS.mint,
  COLORS.yellow,
  COLORS.coral,
  COLORS.apron,
];
const surfaces = new WeakMap<CanvasRenderingContext2D, Surface>();

function shade(color: Color, amount: number): Color {
  return [color[0] * amount, color[1] * amount, color[2] * amount];
}

function face(points: readonly Vec3[], color: Color): Face {
  return { points, color };
}

function box(
  x: number,
  y: number,
  z: number,
  width: number,
  length: number,
  height: number,
  color: Color,
): Face[] {
  const a: Vec3 = [x, y, z];
  const b: Vec3 = [x + width, y, z];
  const c: Vec3 = [x + width, y + length, z];
  const d: Vec3 = [x, y + length, z];
  const e: Vec3 = [x, y, z + height];
  const f: Vec3 = [x + width, y, z + height];
  const g: Vec3 = [x + width, y + length, z + height];
  const h: Vec3 = [x, y + length, z + height];
  return [
    face([a, b, f, e], shade(color, 0.82)),
    face([b, c, g, f], shade(color, 0.9)),
    face([c, d, h, g], color),
    face([d, a, e, h], shade(color, 0.94)),
    face([e, f, g, h], shade(color, 1.09)),
  ];
}

function disc(
  x: number,
  y: number,
  z: number,
  radius: number,
  color: Color,
  segments = 16,
): Face[] {
  const points: Vec3[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push([
      x + Math.cos(angle) * radius,
      y + Math.sin(angle) * radius,
      z,
    ]);
  }
  return [face(points, color)];
}

function ring(
  x: number,
  y: number,
  z: number,
  radius: number,
  thickness: number,
  color: Color,
): Face[] {
  const faces: Face[] = [];
  for (let i = 0; i < 24; i += 1) {
    const a = (i / 24) * Math.PI * 2;
    const b = ((i + 1) / 24) * Math.PI * 2;
    faces.push(
      face(
        [
          [x + Math.cos(a) * radius, y + Math.sin(a) * radius, z],
          [x + Math.cos(b) * radius, y + Math.sin(b) * radius, z],
          [
            x + Math.cos(b) * (radius - thickness),
            y + Math.sin(b) * (radius - thickness),
            z,
          ],
          [
            x + Math.cos(a) * (radius - thickness),
            y + Math.sin(a) * (radius - thickness),
            z,
          ],
        ],
        color,
      ),
    );
  }
  return faces;
}

function cylinder(
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  color: Color,
): Face[] {
  const faces = disc(x, y, z + height, radius, shade(color, 1.08), 8);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const b = ((i + 1) / 8) * Math.PI * 2;
    faces.push(
      face(
        [
          [x + Math.cos(a) * radius, y + Math.sin(a) * radius, z],
          [x + Math.cos(b) * radius, y + Math.sin(b) * radius, z],
          [x + Math.cos(b) * radius, y + Math.sin(b) * radius, z + height],
          [x + Math.cos(a) * radius, y + Math.sin(a) * radius, z + height],
        ],
        shade(color, 0.8 + 0.15 * Math.cos(a)),
      ),
    );
  }
  return faces;
}

/** Static scenery is authored once. Counter silhouettes use the collision bounds exactly. */
function buildRoom(): Face[] {
  const w = WORLD.width;
  const h = WORLD.height;
  const ceiling = WORLD.ceilingHeight;
  const faces: Face[] = [
    face(
      [
        [0, 0, 0],
        [w, 0, 0],
        [w, h, 0],
        [0, h, 0],
      ],
      COLORS.floor,
    ),
    face(
      [
        [0, 0, ceiling],
        [w, 0, ceiling],
        [w, h, ceiling],
        [0, h, ceiling],
      ],
      COLORS.ceiling,
    ),
  ];
  faces.push(
    face(
      [
        [0, 0, 0],
        [w, 0, 0],
        [w, 0, ceiling],
        [0, 0, ceiling],
      ],
      COLORS.wall,
    ),
    face(
      [
        [0, h, 0],
        [w, h, 0],
        [w, h, ceiling],
        [0, h, ceiling],
      ],
      shade(COLORS.wall, 0.9),
    ),
    face(
      [
        [0, 0, 0],
        [0, h, 0],
        [0, h, ceiling],
        [0, 0, ceiling],
      ],
      shade(COLORS.wall, 0.94),
    ),
    face(
      [
        [w, 0, 0],
        [w, h, 0],
        [w, h, ceiling],
        [w, 0, ceiling],
      ],
      shade(COLORS.wall, 0.87),
    ),
  );
  // Floor seams and wall bands are paint, not additional blocking geometry.
  for (let x = 1; x < w; x += 1)
    faces.push(
      face(
        [
          [x, 0, 0.002],
          [x + 0.018, 0, 0.002],
          [x + 0.018, h, 0.002],
          [x, h, 0.002],
        ],
        COLORS.grout,
      ),
    );
  for (let y = 1; y < h; y += 1)
    faces.push(
      face(
        [
          [0, y, 0.002],
          [w, y, 0.002],
          [w, y + 0.018, 0.002],
          [0, y + 0.018, 0.002],
        ],
        COLORS.grout,
      ),
    );
  faces.push(
    face(
      [
        [0, 0.003, 1.15],
        [w, 0.003, 1.15],
        [w, 0.003, 1.55],
        [0, 0.003, 1.55],
      ],
      COLORS.mint,
    ),
    face(
      [
        [0, h - 0.003, 0.05],
        [w, h - 0.003, 0.05],
        [w, h - 0.003, 0.5],
        [0, h - 0.003, 0.5],
      ],
      COLORS.mint,
    ),
    face(
      [
        [w - 0.003, 0, 0.05],
        [w - 0.003, h, 0.05],
        [w - 0.003, h, 0.5],
        [w - 0.003, 0, 0.5],
      ],
      COLORS.mint,
    ),
    face(
      [
        [0.003, 0, 0.05],
        [0.003, h, 0.05],
        [0.003, h, 0.5],
        [0.003, 0, 0.5],
      ],
      COLORS.mint,
    ),
  );
  for (const counter of WORLD.counters) {
    faces.push(
      ...box(
        counter.minX,
        counter.minY,
        0,
        counter.maxX - counter.minX,
        counter.maxY - counter.minY,
        counter.height,
        counter.ricochet ? COLORS.coral : COLORS.steel,
      ),
    );
    if (counter.ricochet) {
      // The marked obstruction stays solid; its stripes do not imply a new collider.
      for (let y = counter.minY + 0.15; y < counter.maxY; y += 0.4) {
        faces.push(
          face(
            [
              [counter.minX - 0.002, y, 0.25],
              [counter.minX - 0.002, y + 0.12, 0.25],
              [counter.minX - 0.002, y + 0.12, 1.3],
              [counter.minX - 0.002, y, 1.3],
            ],
            COLORS.cream,
          ),
        );
      }
    }
  }
  WORLD.stations.forEach((station, index) => {
    const color = STATION_COLORS[index];
    faces.push(...ring(station.x, station.y, 0.006, 0.56, 0.06, color));
    // A colored inlay identifies each counter without adding solid props to a shot ray.
    faces.push(
      face(
        [
          [station.x - 0.42, 0.52, 1.004],
          [station.x + 0.42, 0.52, 1.004],
          [station.x + 0.42, 1.08, 1.004],
          [station.x - 0.42, 1.08, 1.004],
        ],
        color,
      ),
    );
  });
  return faces;
}

const ROOM_FACES = buildRoom();

function toCamera(point: Vec3, camera: Camera): Vec3 {
  const dx = point[0] - camera.x;
  const dy = point[1] - camera.y;
  const dz = point[2] - RULES.eyeHeight;
  const forward = dx * camera.cosYaw + dy * camera.sinYaw;
  return [
    -dx * camera.sinYaw + dy * camera.cosYaw,
    dz * camera.cosPitch - forward * camera.sinPitch,
    forward * camera.cosPitch + dz * camera.sinPitch,
  ];
}

function project(point: Vec3, camera: Camera): Projected {
  const inverseDepth = 1 / point[2];
  return {
    x: camera.width / 2 + point[0] * camera.focal * inverseDepth,
    y: camera.height / 2 - point[1] * camera.focal * inverseDepth,
    inverseDepth,
  };
}

/** Near-plane clipping keeps close counters correct even at the retained pitch limits. */
function clipNear(points: readonly Vec3[]): Vec3[] {
  const output: Vec3[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const aInside = a[2] >= NEAR;
    const bInside = b[2] >= NEAR;
    if (aInside) output.push(a);
    if (aInside !== bInside) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      output.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
    }
  }
  return output;
}

function edge(a: Projected, b: Projected, x: number, y: number) {
  return (x - a.x) * (b.y - a.y) - (y - a.y) * (b.x - a.x);
}

function triangle(
  surface: Surface,
  a: Projected,
  b: Projected,
  c: Projected,
  color: Color,
) {
  let area = edge(a, b, c.x, c.y);
  if (Math.abs(area) < 0.00001) return;
  if (area < 0) {
    const oldB = b;
    b = c;
    c = oldB;
    area = -area;
  }
  const { width, height, data } = surface.pixels;
  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
  const inverseArea = 1 / area;
  const fog = Math.min(
    0.35,
    Math.max(
      0,
      (3 / (a.inverseDepth + b.inverseDepth + c.inverseDepth) - 3) / 27,
    ),
  );
  const r = Math.round(color[0] * (1 - fog) + COLORS.ceiling[0] * fog);
  const g = Math.round(color[1] * (1 - fog) + COLORS.ceiling[1] * fog);
  const blue = Math.round(color[2] * (1 - fog) + COLORS.ceiling[2] * fog);
  const stepA = c.y - b.y;
  const stepB = a.y - c.y;
  const stepC = b.y - a.y;
  for (let y = minY; y <= maxY; y += 1) {
    let wa = edge(b, c, minX + 0.5, y + 0.5);
    let wb = edge(c, a, minX + 0.5, y + 0.5);
    let wc = edge(a, b, minX + 0.5, y + 0.5);
    for (let x = minX; x <= maxX; x += 1) {
      if (wa >= 0 && wb >= 0 && wc >= 0) {
        const depth =
          (wa * a.inverseDepth + wb * b.inverseDepth + wc * c.inverseDepth) *
          inverseArea;
        const index = y * width + x;
        if (depth > surface.depth[index]) {
          surface.depth[index] = depth;
          const offset = index * 4;
          data[offset] = r;
          data[offset + 1] = g;
          data[offset + 2] = blue;
          data[offset + 3] = 255;
        }
      }
      wa += stepA;
      wb += stepB;
      wc += stepC;
    }
  }
}

function drawFace(surface: Surface, camera: Camera, item: Face) {
  const points = clipNear(
    item.points.map((point) => toCamera(point, camera)),
  ).map((point) => project(point, camera));
  for (let i = 1; i < points.length - 1; i += 1)
    triangle(surface, points[0], points[i], points[i + 1], item.color);
}

function movingFaces(state: Readonly<KitchenSnapshot>): Face[] {
  const faces: Face[] = [];
  for (const zombie of state.zombies) {
    const stunned = zombie.stunnedUntilTick > state.tick;
    const skin = stunned ? COLORS.yellow : COLORS.zombie;
    const radius = RULES.zombieRadius;
    faces.push(
      ...box(
        zombie.x - 0.2,
        zombie.y - 0.12,
        0.02,
        0.15,
        0.24,
        0.2,
        COLORS.ink,
      ),
      ...box(
        zombie.x + 0.05,
        zombie.y - 0.12,
        0.02,
        0.15,
        0.24,
        0.2,
        COLORS.ink,
      ),
      ...cylinder(zombie.x, zombie.y, 0.18, radius * 0.8, 0.94, COLORS.apron),
      ...cylinder(
        zombie.x,
        zombie.y,
        1.12,
        radius * 0.86,
        RULES.zombieHeight - 1.12,
        skin,
      ),
    );
    // A face always looks at the camera; its dimensions remain inside the retained cylinder.
    const toward = Math.atan2(
      state.player.y - zombie.y,
      state.player.x - zombie.x,
    );
    const nx = Math.cos(toward);
    const ny = Math.sin(toward);
    const tx = -ny;
    const ty = nx;
    for (const side of [-1, 1]) {
      const centerX = zombie.x + nx * radius * 0.87 + tx * side * 0.11;
      const centerY = zombie.y + ny * radius * 0.87 + ty * side * 0.11;
      faces.push(
        face(
          [
            [centerX - tx * 0.034, centerY - ty * 0.034, 1.47],
            [centerX + tx * 0.034, centerY + ty * 0.034, 1.47],
            [centerX + tx * 0.034, centerY + ty * 0.034, 1.55],
            [centerX - tx * 0.034, centerY - ty * 0.034, 1.55],
          ],
          COLORS.ink,
        ),
      );
    }
    // The remaining health is visible on the head; no invented damage or disappearance.
    for (let hp = 0; hp < zombie.hp; hp += 1) {
      faces.push(
        ...disc(
          zombie.x + (hp - 0.5) * 0.11,
          zombie.y,
          RULES.zombieHeight + 0.008,
          0.04,
          COLORS.cream,
          6,
        ),
      );
    }
    if (zombie.target === 'bell')
      faces.push(
        ...ring(zombie.x, zombie.y, 0.012, radius + 0.12, 0.045, COLORS.yellow),
      );
    if (zombie.target === 'stove')
      faces.push(
        ...ring(zombie.x, zombie.y, 0.012, radius + 0.12, 0.045, COLORS.coral),
      );
  }
  for (const drop of state.drops) {
    faces.push(
      ...box(
        drop.x - 0.11,
        drop.y - 0.11,
        0.015,
        0.22,
        0.22,
        0.2,
        COLORS.yellow,
      ),
      ...ring(drop.x, drop.y, 0.008, 0.3, 0.03, COLORS.apron),
    );
  }
  if (state.bell && state.bell.untilTick > state.tick) {
    // Animation is a function of the simulation tick, never another clock.
    const phase = (state.tick % RULES.ticksPerSecond) / RULES.ticksPerSecond;
    faces.push(
      ...ring(
        state.bell.x,
        state.bell.y,
        0.018,
        0.7 + phase * 0.7,
        0.055,
        COLORS.yellow,
      ),
    );
  }
  return faces;
}

function getSurface(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): Surface {
  const scale = Math.min(1, 480 / width, 300 / height);
  const renderWidth = Math.max(1, Math.round(width * scale));
  const renderHeight = Math.max(1, Math.round(height * scale));
  let surface = surfaces.get(context);
  if (
    !surface ||
    surface.canvas.width !== renderWidth ||
    surface.canvas.height !== renderHeight
  ) {
    const canvas = context.canvas.ownerDocument.createElement('canvas');
    canvas.width = renderWidth;
    canvas.height = renderHeight;
    const draw = canvas.getContext('2d');
    if (!draw)
      throw new Error(
        'A 2D canvas is required for the Kitchen Chaos viewport.',
      );
    surface = {
      canvas,
      context: draw,
      pixels: draw.createImageData(renderWidth, renderHeight),
      depth: new Float32Array(renderWidth * renderHeight),
    };
    surfaces.set(context, surface);
  }
  return surface;
}

function visibleProjection(
  point: Vec3,
  camera: Camera,
  surface: Surface,
): Projected | null {
  const cameraPoint = toCamera(point, camera);
  if (cameraPoint[2] < NEAR) return null;
  const projected = project(cameraPoint, camera);
  const x = Math.floor(projected.x);
  const y = Math.floor(projected.y);
  if (x < 0 || y < 0 || x >= camera.width || y >= camera.height) return null;
  // Labels belong to objects visible from this viewpoint, including behind the tall counter.
  if (projected.inverseDepth + 0.002 < surface.depth[y * camera.width + x])
    return null;
  return projected;
}

function roundedPanel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, 6);
  context.fillStyle = color;
  context.fill();
}

function stationLabels(
  context: CanvasRenderingContext2D,
  state: Readonly<KitchenSnapshot>,
  camera: Camera,
  surface: Surface,
  scaleX: number,
  scaleY: number,
) {
  const fontSize = Math.max(10, Math.min(15, (camera.width * scaleX) / 58));
  context.font = `700 ${fontSize}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  WORLD.stations.forEach((station, index) => {
    const position = visibleProjection(
      [station.x, station.y, 1.55],
      camera,
      surface,
    );
    if (!position) return;
    const x = position.x * scaleX;
    const y = position.y * scaleY;
    const name = `${index + 1}  ${STATION_NAMES[station.id]}`;
    const labelWidth = context.measureText(name).width + 20;
    roundedPanel(
      context,
      x - labelWidth / 2,
      y - 14,
      labelWidth,
      28,
      'rgba(248, 246, 232, .94)',
    );
    context.fillStyle = '#253c32';
    context.fillText(name, x, y);
    if (station.id === 'stove' && state.stove.readyAtTick !== null) {
      const ready = state.tick >= state.stove.readyAtTick;
      const cookTicks =
        state.recipe.cooking === 'quick-orders'
          ? RULES.quickCookTicks
          : RULES.batchCookTicks;
      const progress = ready
        ? 1
        : 1 - (state.stove.readyAtTick - state.tick) / cookTicks;
      roundedPanel(context, x - 42, y + 18, 84, 7, '#c9cbbb');
      roundedPanel(
        context,
        x - 42,
        y + 18,
        Math.max(0, Math.min(1, progress)) * 84,
        7,
        ready ? '#2e765c' : '#d57e47',
      );
      context.font = `600 ${Math.max(10, fontSize - 2)}px system-ui, sans-serif`;
      context.fillStyle = '#253c32';
      context.fillText(ready ? 'READY · COLLECT' : 'COOKING', x, y + 38);
      context.font = `700 ${fontSize}px system-ui, sans-serif`;
    }
  });
}

function heldItem(
  context: CanvasRenderingContext2D,
  state: Readonly<KitchenSnapshot>,
  width: number,
  height: number,
) {
  const size = Math.min(125, width * 0.16, height * 0.29);
  const x = width / 2 + Math.min(width * 0.22, 200);
  const y = height - size * 0.23;
  const carry = state.player.carry;
  context.save();
  context.translate(x, y);
  context.rotate(-0.1);
  context.lineWidth = 3;
  context.strokeStyle = '#243b32';
  if (carry) {
    context.fillStyle = '#ede6cf';
    context.beginPath();
    context.ellipse(0, 0, size, size * 0.35, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    const isDish = carry.kind === 'dish';
    context.fillStyle = isDish
      ? '#dc8852'
      : carry.kind === 'prepared'
        ? '#88ae74'
        : '#d9b162';
    for (let i = 0; i < (isDish ? 5 : 3); i += 1) {
      const dx = ((i % 3) - 1) * size * 0.31;
      const dy = Math.floor(i / 3) * size * 0.15 - size * 0.14;
      context.beginPath();
      context.ellipse(
        dx,
        dy,
        size * 0.19,
        size * (carry.kind === 'prepared' ? 0.1 : 0.2),
        -0.2,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
    }
    if (isDish && state.recipe.additions.includes('hot-potato')) {
      const remaining = Math.max(
        0,
        RULES.hotPotatoCarryTicks - (state.tick - carry.acquiredAtTick),
      );
      roundedPanel(context, -37, -size * 0.64, 74, 26, '#253c32');
      context.fillStyle = '#fff1c7';
      context.font = '700 13px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText(
        `${Math.ceil(remaining / RULES.ticksPerSecond)}s TO SERVE`,
        0,
        -size * 0.64 + 17,
      );
    }
  } else {
    // An abstract kitchen blaster; the actual shot ray is always the centered reticle.
    roundedPanel(
      context,
      -size * 0.3,
      -size * 0.5,
      size * 0.6,
      size * 1.1,
      '#253c32',
    );
    roundedPanel(
      context,
      -size * 0.23,
      -size * 0.55,
      size * 0.46,
      size * 0.3,
      '#789b82',
    );
    roundedPanel(
      context,
      -size * 0.16,
      -size * 0.59,
      size * 0.32,
      size * 0.13,
      '#e8b560',
    );
  }
  context.restore();
}

function reticle(
  context: CanvasRenderingContext2D,
  state: Readonly<KitchenSnapshot>,
  width: number,
  height: number,
) {
  const x = width / 2;
  const y = height / 2;
  const recentShot =
    state.nextShotTick > state.tick &&
    state.nextShotTick - state.tick > RULES.shotCooldownTicks - 4;
  const hit = state.events.some((event) => event.type === 'hit');
  const gap = recentShot ? 9 : 5;
  context.lineWidth = 3;
  context.strokeStyle = 'rgba(28, 47, 40, .85)';
  context.beginPath();
  context.moveTo(x - gap - 6, y);
  context.lineTo(x - gap, y);
  context.moveTo(x + gap, y);
  context.lineTo(x + gap + 6, y);
  context.moveTo(x, y - gap - 6);
  context.lineTo(x, y - gap);
  context.moveTo(x, y + gap);
  context.lineTo(x, y + gap + 6);
  context.stroke();
  context.lineWidth = 1.5;
  context.strokeStyle = hit ? '#fbd986' : '#ffffef';
  context.stroke();
  if (state.player.slowedUntilTick > state.tick) {
    context.strokeStyle = 'rgba(166, 73, 52, .7)';
    context.lineWidth = 9;
    context.strokeRect(4, 4, width - 8, height - 8);
  }
}

/**
 * A bounded first-person software viewport of the retained Kitchen Chaos snapshot.
 * This function never advances a tick, retains events, reads a clock, or changes state.
 * Width/height are the caller's canvas coordinate dimensions (including DPR if used).
 */
export function renderKitchen(
  context: CanvasRenderingContext2D,
  snapshot: KitchenPartySnapshot,
  width: number,
  height: number,
): void {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1
  )
    return;
  const surface = getSurface(context, width, height);
  const state = snapshot.state;
  const renderWidth = surface.canvas.width;
  const renderHeight = surface.canvas.height;
  const camera: Camera = {
    x: state.player.x,
    y: state.player.y,
    cosYaw: Math.cos(state.player.yaw),
    sinYaw: Math.sin(state.player.yaw),
    cosPitch: Math.cos(state.player.pitch),
    sinPitch: Math.sin(state.player.pitch),
    focal: renderWidth / (2 * Math.tan(Math.PI / 5.2)),
    width: renderWidth,
    height: renderHeight,
  };
  surface.depth.fill(0);
  surface.pixels.data.fill(0);
  for (const item of ROOM_FACES) drawFace(surface, camera, item);
  for (const item of movingFaces(state)) drawFace(surface, camera, item);
  surface.context.putImageData(surface.pixels, 0, 0);
  context.save();
  context.imageSmoothingEnabled = false;
  context.fillStyle = '#ede9d8';
  context.fillRect(0, 0, width, height);
  context.drawImage(surface.canvas, 0, 0, width, height);
  stationLabels(
    context,
    state,
    camera,
    surface,
    width / renderWidth,
    height / renderHeight,
  );
  heldItem(context, state, width, height);
  reticle(context, state, width, height);
  context.restore();
}
