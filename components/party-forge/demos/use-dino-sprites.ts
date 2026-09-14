import { useEffect, useState } from 'react';
import {
  DINO_SPRITE_PATHS,
  type DinoSprites,
} from '@/lib/party-forge/presentation/dino-view';
export function useDinoSprites() {
  const [sprites, setSprites] = useState<DinoSprites>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      });
    Promise.all([load(DINO_SPRITE_PATHS.meat), load(DINO_SPRITE_PATHS.evolved)])
      .then(([meat, evolved]) => {
        if (active) setSprites({ meat, evolved });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return { sprites, failed };
}
