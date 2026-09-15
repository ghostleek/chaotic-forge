import { test, expect } from '@playwright/test';

test('two own-browser players build the authored remix, compete and contribute the next twist', async ({ page, browser }, testInfo) => {
  test.setTimeout(100_000);
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guest = await guestContext.newPage();
  try {
    // Local UI funding fixture; the retained authored game makes no model call.
    await page.route('**/api/forge/access', route => route.fulfill({ json: { csrf: 'local-test', billing: { admin: true, hasKey: false, trial: false, remaining: 0, email: 'fixture@example.com', userId: 'fixture' } } }));
    await page.goto('/');
    await page.getByRole('button', { name: 'Skip introduction' }).click();
    await page.getByRole('textbox', { name: 'Your name' }).fill('Dino player');
    await page.getByRole('button', { name: 'Create room', exact: true }).click();
    await page.getByRole('button', { name: 'Create live room', exact: true }).click();
    const invite = page.getByRole('link', { name: /^Room / });
    await expect(invite).toBeVisible();
    await guest.goto(new URL((await invite.getAttribute('href'))!, page.url()).href);
    await guest.getByRole('textbox', { name: 'Your name' }).fill('Mario player');
    await guest.getByRole('button', { name: 'Join room', exact: true }).click();
    for (const player of [page, guest]) await expect(player.getByText('2/3 players · lobby', { exact: true })).toBeVisible();
    for (const [player, instruction] of [[page, 'Chrome offline Dino run'], [guest, 'Mario']] as const) {
      await player.getByRole('textbox', { name: 'Your instruction', exact: true }).fill(instruction);
      await player.getByRole('button', { name: 'Confirm instruction', exact: true }).click();
      for (const observer of [page, guest]) await expect(observer.locator('p').filter({ hasText: new RegExp(`^${instruction}$`) })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Build game', exact: true }).click();
    let readyCount = 0;
    for (const player of [page, guest]) {
      await expect(player.getByRole('button', { name: 'Ready to play' })).toBeEnabled({ timeout: 20_000 });
      await player.getByRole('button', { name: 'Ready to play' }).click();
      readyCount++;
      for (const observer of [page, guest]) await expect(observer.getByText(`${readyCount}/2 players ready for this build.`, { exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Start round', exact: true }).click();
    await expect(guest.getByLabel('Dino arena. Space or Up to jump.', { exact: true })).toBeVisible();
    await guest.screenshot({ path: `outputs/dino-v2/competitive-${testInfo.project.name}.png`, fullPage: true });
    for (const player of [page, guest]) await expect(player.getByRole('heading', { name: 'Round results', exact: true })).toBeVisible({ timeout: 45_000 });
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    for (const text of ['Double stomp points', 'Double meat points']) {
      await expect.poll(async () => {
        for (const player of [page, guest]) if (await player.getByRole('textbox', { name: 'Add one new instruction' }).isEnabled().catch(() => false)) return true;
        return false;
      }).toBe(true);
      const player = await page.getByRole('textbox', { name: 'Add one new instruction' }).isEnabled().catch(() => false) ? page : guest;
      await player.getByRole('textbox', { name: 'Add one new instruction' }).fill(text);
      await player.getByRole('button', { name: 'Confirm instruction', exact: true }).click();
    }
    for (const player of [page, guest]) await expect(player.getByRole('button', { name: 'Ready to play' })).toBeEnabled({ timeout: 20_000 });
  } finally { await guestContext.close(); }
});
