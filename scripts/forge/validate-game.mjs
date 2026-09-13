import {
  playerHtml,
  PLAYER_CSP,
} from '../../lib/party-forge/generation/player.ts';
import { chromium } from '@playwright/test';
import { MAX_ARTIFACT_BYTES } from '../../lib/party-forge/generation/contracts.ts';
/** Executes output only inside an opaque-origin browser sandbox. Never eval in Node. */
export async function validateGame(html) {
  if (Buffer.byteLength(html) > MAX_ARTIFACT_BYTES)
    throw new Error('Unsupported artifact');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    chromiumSandbox: true,
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.name));
    await context.route('**/*', (route) => {
      if (route.request().url() === 'https://forge-artifact.invalid/game')
        return route.fulfill({
          body: playerHtml(html),
          contentType: 'text/html',
          headers: { 'Content-Security-Policy': PLAYER_CSP },
        });
      return route.abort();
    });
    await page.setContent(
      '<iframe title="Game" sandbox="allow-scripts" src="https://forge-artifact.invalid/game"></iframe>',
    );
    const frame = page.frameLocator('iframe');
    await frame
      .getByRole('button', { name: 'Start game', exact: true })
      .click();
    await frame.locator('#game-state').filter({ hasText: 'playing' }).waitFor();
    const canvas = frame.locator('canvas').first();
    const before = await canvas.screenshot();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.down('Space');
    await page.waitForTimeout(600);
    await page.keyboard.up('Space');
    const after = await canvas.screenshot();
    if (before.equals(after) || errors.length)
      throw new Error('Game did not animate cleanly');
    return {
      validator: 'forge-browser-smoke/1',
      checkedAt: new Date().toISOString(),
      startButton: true,
      playingState: true,
      renderedChange: true,
      scriptErrors: 0,
      note: 'Observed start and rendered change with input; mechanic retention and completing runs need qualification.',
    };
  } finally {
    await browser.close();
  }
}
