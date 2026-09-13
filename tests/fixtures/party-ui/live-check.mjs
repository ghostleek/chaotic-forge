import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  prepareHostConfig,
  migrateLocal,
  startHost,
} from '../../../scripts/party-host-process.mjs';
const directory = await mkdtemp(resolve('.wrangler/pc04-ui-'));
const config = await prepareHostConfig({ directory });
await migrateLocal(config, `${directory}/state`);
const host = await startHost({
  config,
  persistTo: `${directory}/state`,
  port: 3127,
});
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext()));
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const errors = [];
  for (const page of pages) page.on('pageerror', (e) => errors.push(e.message));
  await pages[0].goto(`${host.baseURL}/party`);
  await pages[0].getByLabel('Your name').fill('Kahhow');
  await pages[0]
    .getByRole('button', { name: 'Create room', exact: true })
    .click();
  try {
    await pages[0].waitForURL(/\/party\/[\w-]+$/);
  } catch (e) {
    console.log(await pages[0].locator('body').innerText(), errors);
    throw e;
  }
  const invitation = pages[0].url();
  for (const [i, name] of [
    [1, 'Mira'],
    [2, 'Lance'],
  ]) {
    await pages[i].goto(invitation);
    await pages[i].getByLabel('Your name').fill(name);
    await pages[i]
      .getByRole('button', { name: 'Join room', exact: true })
      .click();
    await pages[i]
      .getByRole('button', { name: 'Select Knockback', exact: true })
      .waitFor();
  }
  await pages[0].getByRole('button', { name: 'Swat the illustrated world' }).waitFor();
  await pages[0].getByRole('button', { name: 'Swat the illustrated world' }).click();
  await pages[0].getByRole('button', { name: 'Restore the world', exact: true }).first().click();
  // A server commit whose response is lost must remain uncertain, never optimistic.
  let dropped = false;
  await pages[0].route('**/commands', async (route) => {
    if (!dropped) {
      dropped = true;
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await pages[0]
    .getByRole('button', { name: 'Select Knockback', exact: true })
    .click();
  await pages[0]
    .getByRole('button', { name: 'Confirm contribution', exact: true })
    .click();
  await pages[0]
    .getByRole('button', { name: 'Retry previous request' })
    .waitFor();
  await pages[0]
    .getByRole('button', { name: 'Retry previous request' })
    .click();
  await pages[0]
    .getByRole('button', { name: 'Contribution confirmed' })
    .waitFor();
  for (const [i, name] of [
    [1, 'Pursuers'],
    [2, 'Quick orders'],
  ]) {
    await pages[i]
      .getByRole('button', { name: `Select ${name}`, exact: true })
      .click();
    // Wait for polling to observe the preceding authority revision.
    await pages[i].waitForTimeout(4500);
    await pages[i]
      .getByRole('button', { name: 'Confirm contribution', exact: true })
      .click();
  }
  for (const page of pages)
    await page
      .getByRole('heading', { name: 'Your game is ready', exact: true })
      .waitFor({ timeout: 20000 });
  await pages[1].reload();
  await pages[1]
    .getByRole('heading', { name: 'Your game is ready', exact: true })
    .waitFor();
  assert.equal(await pages[1].getByLabel('Your name').count(), 0);
  for (const page of pages) {
    await page
      .getByRole('button', { name: 'Load and confirm build', exact: true })
      .click();
    await page.waitForTimeout(4500);
  }
  await pages[0]
    .getByText('3/3 players ready for this build.', { exact: true })
    .waitFor();
  await pages[0].getByRole('button', { name: 'Got it', exact: true }).click();
  assert.equal(
    await pages[0].getByRole('complementary', { name: 'How to play' }).count(),
    0,
  );
  await pages[0]
    .getByRole('button', { name: 'How to play', exact: true })
    .click();
  await pages[0].setViewportSize({ width: 390, height: 844 });
  console.log(await pages[0].evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth).map(el => [el.tagName, el.className, el.getBoundingClientRect().width])));
  await pages[0].screenshot({ path: '/private/tmp/pc04-live-mobile.png', fullPage: true });
  assert.equal(
    await pages[0].evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await pages[0].screenshot({
    path: '/private/tmp/pc04-live-mobile.png',
    fullPage: true,
  });
  for (const page of pages) assert.ok(!page.url().includes('capability'));
  assert.deepEqual(errors, []);
  console.log(
    'PASS: actual Worker/D1, three isolated browsers, lost-response retry, fixed recipe, reload recovery, shared readiness, onboarding, swat, mobile overflow, no page errors.',
  );
} finally {
  await browser.close();
  await host.stop();
}
