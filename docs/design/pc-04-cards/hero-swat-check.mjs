import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.CARD_STUDY_URL || 'http://127.0.0.1:4319';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (entry) => {
  if (entry.type() === 'error') errors.push(entry.text());
});
await mkdir(new URL('./verification/', import.meta.url), { recursive: true });
const swat = page.getByRole('button', {
  name: "Make Mira's cat swat the world",
  exact: true,
});
const restore = page.getByRole('button', {
  name: 'Bring it back ↶',
  exact: true,
});
const state = () =>
  page.evaluate(() => ({
    hand: [...document.querySelectorAll('#hand forge-card')].map((card) => [
      card.dataset.cardId,
      card.hasAttribute('locked'),
    ]),
    players: [
      ...document.querySelectorAll('#player-status [data-player-id]'),
    ].map((player) => [player.dataset.playerId, player.dataset.status]),
    contributions: document.querySelector('#contribution-list').textContent,
  }));
const confirm = async () => {
  await page
    .getByRole('button', { name: 'Select Knockback', exact: true })
    .click();
  await page.locator('#preview').click();
  await page.locator('#confirm-add').click();
};
const noOverflow = async () =>
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
try {
  await page.goto(`${base}/play.html`, { waitUntil: 'networkidle' });
  await page
    .getByRole('button', { name: 'Dismiss introduction', exact: true })
    .click();
  assert.equal(
    await swat.isDisabled(),
    true,
    'The trick is unlocked by a confirmed local choice',
  );
  await page
    .getByRole('button', { name: 'Use Cloud cat', exact: true })
    .click();
  assert.match(
    await page.locator('[data-player-id="you"] img').getAttribute('src'),
    /cloud\.svg/,
  );
  await confirm();
  assert.match(
    await page.locator('[data-player-id="you"] img').getAttribute('src'),
    /cloud\.svg/,
    'The React bridge retains avatar choice through confirmation',
  );
  const before = await state();
  await swat.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => document.querySelector('#world').dataset.heroState === 'swatting',
  );
  // Freeze the real animations for a reproducible visual check at contact.
  await page.locator('#world').evaluate((world) => {
    for (const animation of world.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = 720;
    }
  });
  assert.equal(await page.locator('.hero-swat-cat').isVisible(), true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await noOverflow();
  await page.screenshot({
    path: new URL('./verification/hero-swat-contact.png', import.meta.url)
      .pathname,
  });
  await page.locator('#world').evaluate((world) => {
    for (const animation of world.getAnimations({ subtree: true }))
      animation.play();
  });
  // Repeated activation does not spawn a second cat or alter the room state.
  await swat.evaluate((button) => {
    button.click();
    button.click();
  });
  assert.equal(await page.locator('.hero-swat-cat').count(), 1);
  await page.waitForFunction(
    () => document.querySelector('#world').dataset.heroState === 'away',
  );
  assert.equal(
    await page
      .locator('#world > svg')
      .evaluate((svg) => getComputedStyle(svg).visibility),
    'hidden',
  );
  assert.deepEqual(await state(), before);
  assert.equal(
    await restore.evaluate((button) => button === document.activeElement),
    true,
  );
  await page.keyboard.press('Enter');
  assert.equal(
    await page.locator('#world').getAttribute('data-hero-state'),
    'idle',
  );
  assert.equal(
    await page
      .locator('#world > svg')
      .evaluate((svg) => getComputedStyle(svg).visibility),
    'visible',
  );
  assert.equal(
    await swat.evaluate((button) => button === document.activeElement),
    true,
  );
  assert.deepEqual(await state(), before);

  await swat.click();
  await page.locator('#reset').click();
  await page.waitForTimeout(1900);
  assert.equal(
    await page.locator('#world').getAttribute('data-hero-state'),
    'idle',
    'Reset cancels delayed completion',
  );
  assert.equal(
    await page.locator('.hero-swat-cat, .hero-swat-recovery').count(),
    0,
  );
  assert.equal(await page.locator('#contribution-list li').count(), 0);
  assert.equal(await swat.isDisabled(), true);

  await confirm();
  await swat.click();
  await page.setViewportSize({ width: 930, height: 900 });
  await page.waitForFunction(
    () => document.querySelector('#world').dataset.heroState === 'idle',
  );
  assert.equal(
    await page
      .locator('#world > svg')
      .evaluate((svg) => getComputedStyle(svg).visibility),
    'visible',
    'Resize safely cancels the effect',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const mobileState = await state();
  await swat.click();
  assert.equal(
    await page.locator('#world').getAttribute('data-hero-state'),
    'away',
    'Reduced motion reaches a stable state immediately',
  );
  assert.equal(
    await page
      .locator('#world')
      .evaluate((world) => world.getAnimations({ subtree: true }).length),
    0,
  );
  await noOverflow();
  await page.screenshot({
    path: new URL(
      './verification/hero-swat-mobile-reduced.png',
      import.meta.url,
    ).pathname,
  });
  await restore.click();
  assert.deepEqual(await state(), mobileState);
  await page.setViewportSize({ width: 320, height: 780 });
  await noOverflow();
  assert.deepEqual(errors, []);
  console.log(
    'PASS: avatar continuity; keyboard swat/restore and focus; no changed choices; repeated activation; in-flight reset/resize; reduced motion; 320px layout; no console errors.',
  );
} finally {
  await browser.close();
}
