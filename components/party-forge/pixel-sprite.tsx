/** Original bitmap drawings. Shared by cards, avatars and the title screen. */
export const PIXEL_SPRITES = {
  cat: ['11000011','11100111','11111111','10111101','10111101','11100111','01111110','00100100'],
  alien: ['00100100','00011000','00111100','01111110','11011011','11111111','10100101','00100100'],
  snake: ['00011110','00010010','00011110','00010000','11110000','10000000','11111100','00000000'],
  bounce: ['01000000','00100000','00010000','00001000','00000100','00001000','00010000','00100000'],
  food: ['00010000','00111000','01000100','11111110','11111110','01111100','00111000','00010000'],
} as const;
export function PixelSprite({ kind = 'cat', color = 'currentColor', size = 48 }: { kind?: keyof typeof PIXEL_SPRITES; color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
    {PIXEL_SPRITES[kind].flatMap((row, y) => row.split('').map((bit, x) => bit === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} /> : null))}
  </svg>;
}
