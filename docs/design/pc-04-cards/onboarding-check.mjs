import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const base = process.env.CARD_STUDY_URL || 'http://127.0.0.1:4318';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (entry) => { if (entry.type() === 'error') errors.push(entry.text()); });
const state = () => page.evaluate(() => ({
  hand: [...document.querySelectorAll('#hand forge-card')].map((card) => [card.dataset.cardId, card.hasAttribute('selected'), card.hasAttribute('locked')]),
  players: [...document.querySelectorAll('#player-status [data-player-id]')].map((player) => [player.dataset.playerId, player.dataset.status]),
  contributions: document.querySelector('#contribution-list').textContent,
}));
const introduction = page.locator('#onboarding section');
try {
  await page.goto(`${base}/play.html?view=3d`, { waitUntil: 'networkidle' });
  assert.equal(new URL(page.url()).searchParams.has('view'), false, 'Old view links resolve to the fixed presentation');
  assert.equal(await page.locator('#view-2d, #view-3d, .view-control, .study-policy, .page-footer, .aside-note, .world-caption').count(), 0);
  assert.equal(await introduction.isVisible(), true);
  assert.equal(await page.locator('#onboarding-title').evaluate((el) => document.activeElement === el), false, 'Initial onboarding does not steal focus');
  assert.match(await page.locator('#world svg').getAttribute('aria-label'), /3D axonometric/);
  assert.equal(await page.locator('.preview-badge').textContent(), 'Preview room');
  assert.ok(await page.locator('#player-status [data-player-id] img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0 && !image.src.endsWith('-3d.svg'))));
  await page.screenshot({ path: new URL('./verification/onboarding-desktop.png', import.meta.url).pathname, fullPage: true });

  await page.getByRole('button', { name: 'Select Knockback', exact: true }).click();
  const selected = await state();
  await page.getByRole('button', { name: 'Dismiss introduction', exact: true }).click();
  assert.equal(await introduction.isVisible(), false);
  assert.equal(await page.locator('#hand-heading').evaluate((el) => document.activeElement === el), true);
  assert.deepEqual(await state(), selected, 'Dismissing does not alter a selection');
  await page.locator('#show-onboarding').click();
  assert.equal(await introduction.isVisible(), true);
  assert.equal(await page.locator('#onboarding-title').evaluate((el) => document.activeElement === el), true);
  await page.getByRole('button', { name: 'Let’s play', exact: false }).click();
  assert.equal(await introduction.isVisible(), false);
  assert.deepEqual(await state(), selected);

  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await introduction.isVisible(), false, 'Dismissal persists for the tab session');
  await page.getByRole('button', { name: 'Select Quick orders', exact: true }).click();
  await page.locator('#preview').click(); await page.locator('#confirm-add').click();
  const waiting = await state();
  await page.locator('#show-onboarding').click();
  await page.getByRole('button', { name: 'Dismiss introduction', exact: true }).click();
  assert.deepEqual(await state(), waiting, 'Onboarding preserves waiting and locks');
  assert.equal(await page.locator('#hand .fc-face:disabled').count(), 6);
  await page.locator('#reset').click();
  assert.equal(await introduction.isVisible(), false, 'Starting again does not force onboarding back');

  for (const width of [1440, 930, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px no horizontal overflow`);
    if (width === 390) {
      const bounds = await page.evaluate(() => ({
        headingBottom: document.querySelector('.hand-header').getBoundingClientRect().bottom,
        actionTop: document.querySelector('.action-bar').getBoundingClientRect().top,
        actionBottom: document.querySelector('.action-bar').getBoundingClientRect().bottom,
        handTop: document.querySelector('.hand').getBoundingClientRect().top,
      }));
      assert.ok(bounds.headingBottom <= bounds.actionTop && bounds.actionBottom <= bounds.handTop, 'Mobile preview bar has its own space');
    }
    if (width !== 930) await page.screenshot({ path: new URL(`./verification/clean-table-${width}.png`, import.meta.url).pathname, fullPage: true });
  }
  await page.locator('#show-onboarding').click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile onboarding fits');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: new URL('./verification/onboarding-mobile.png', import.meta.url).pathname, fullPage: true });
  await page.getByRole('button', { name: 'Dismiss introduction', exact: true }).click();
  await page.getByRole('link', { name: 'CHAOTIC FORGE', exact: false }).click();
  assert.equal(await introduction.isVisible(), false, 'Dismissal survives navigation to the overview');
  assert.equal(await page.locator('#view-2d, #view-3d, .page-footer, .study-policy').count(), 0);
  await page.getByRole('link', { name: 'Try card selection', exact: false }).click();
  assert.equal(await introduction.isVisible(), false);

  const fresh = await browser.newPage();
  await fresh.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
  });
  await fresh.goto(`${base}/play.html`, { waitUntil: 'networkidle' });
  assert.equal(await fresh.locator('#onboarding section').isVisible(), true, 'New session gets an introduction even when storage is unavailable');
  await fresh.getByRole('button', { name: 'Dismiss introduction', exact: true }).click();
  assert.equal(await fresh.locator('#onboarding section').isVisible(), false);
  await fresh.locator('#show-onboarding').click();
  assert.equal(await fresh.locator('#onboarding section').isVisible(), true);
  await fresh.close();
  assert.deepEqual(errors, []);
  console.log('PASS: dismiss/reopen onboarding; session persistence and storage fallback; fixed hero, no toggle or explainer/footer clutter; selected/waiting state continuity; mobile layout; no console errors.');
} finally { await browser.close(); }
