import { test, expect } from '@playwright/test';

test('first-visit introduction is dismissible, session-scoped and reopenable', async ({
  page,
}) => {
  await page.goto('/');
  const intro = page.getByRole('dialog');
  await expect(intro).toBeVisible();
  await expect(
    intro.getByText('Simulated demo · fixed authored example'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Skip introduction' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    intro.getByRole('button', { name: 'Close introduction' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(intro).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'How this remix works' }),
  ).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole('heading', {
      name: 'Your rules. Our game.',
    }),
  ).toBeVisible();
  await expect(intro).not.toBeVisible();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Dino player');
  await page.getByRole('button', { name: 'How this remix works' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox', { name: 'Your name' })).toHaveValue('Dino player');
});

test('denied session storage still permits skip and reopen', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip introduction' }).click();
  await page.getByRole('button', { name: 'How this remix works' }).click();
  await page.getByRole('button', { name: 'Close introduction' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('Browser storage is unavailable. Room access cannot be retained.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Storage test');
  await expect(page.getByRole('button', { name: 'Create room', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('public demo waits for Start, jumps with its button, pauses and preserves state through introduction', async ({
  page,
  isMobile,
}) => {
  const apiCalls: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) apiCalls.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByText('Chrome offline', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'See the remix', exact: false }).click();
  await page.getByRole('link', { name: 'Try simulated demo' }).click();
  const canvas = page.getByLabel('Dino Mario course.', { exact: false });
  await expect(canvas).toHaveAttribute('data-tick', '0');
  await expect(page.getByRole('status')).toContainText('Ready when you are');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const jump = page.getByRole('button', { name: 'Jump', exact: false });
  if (isMobile) await jump.tap();
  else await jump.click();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-feet')))
    .toBeLessThan(250);
  await page.getByRole('button', { name: 'How this remix works' }).click();
  const tick = await canvas.getAttribute('data-tick');
  await page.getByRole('button', { name: 'See the remix', exact: false }).click();
  await page.getByRole('button', { name: 'Back to demo' }).click();
  await expect(page.getByRole('status')).toContainText('Paused');
  await expect(canvas).toHaveAttribute('data-tick', tick!);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-tick')))
    .toBeGreaterThan(Number(tick));
  await page.keyboard.down('Space');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('status')).toContainText('Paused');
  await page.keyboard.up('Space');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByTestId('stomps')).toHaveText('0');
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
});

test('Tab reaches Jump and Enter activates it without pausing within game controls', async ({ page }) => {
  await page.goto('/play/dino-mario');
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Restart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Jump', exact: false })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.clock.runFor(1000 / 60 + 0.05);
  await expect(page.locator('canvas')).toBeFocused();
  expect(Number(await page.locator('canvas').getAttribute('data-feet'))).toBeLessThan(258);
});

test('the browser executes the full seven-jump course and restart retains the authored version', async ({
  page,
}) => {
  await page.goto('/play/dino-mario');
  await expect(
    page.getByRole('button', { name: 'Start', exact: true }),
  ).toBeVisible();
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const canvas = page.locator('canvas');
  let tick = 0;
  for (const press of [143, 293, 543, 693, 977, 1127, 1393]) {
    await page.clock.runFor(((press - tick) * 1000) / 60 + 0.05);
    await expect(canvas).toHaveAttribute('data-tick', String(press));
    await page.keyboard.down('Space');
    await page.clock.runFor(1000 / 60 + 0.05);
    await page.keyboard.up('Space');
    tick = press + 1;
  }
  await page.clock.runFor(((1800 - tick) * 1000) / 60 + 0.05);
  await expect(canvas).toHaveAttribute('data-status', 'won');
  await expect(page.getByRole('status')).toContainText('Course complete');
  await expect(page.getByTestId('stomps')).toHaveText('4');
  await page.clock.runFor(1000);
  await expect(canvas).toHaveAttribute('data-tick', '1800');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-tick', '0');
  await expect(page.getByTestId('stomps')).toHaveText('0');
  await page.clock.runFor(30000);
  await expect(canvas).toHaveAttribute('data-status', 'lost');
});

test('introduction and controls fit a narrow reduced-motion viewport', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const intro = page.getByRole('dialog');
  await expect(intro).toBeVisible();
  await page.screenshot({
    path: `outputs/pc12/onboarding-${testInfo.project.name}.png`,
  });
  await intro
    .getByText('Source, interpretation & decision', { exact: true })
    .click();
  await expect(intro.getByText('User decision', { exact: true })).toBeVisible();
  await intro.getByRole('button', { name: 'Skip introduction' }).click();
  await page.getByRole('link', { name: /Try Dino × Mario/ }).click();
  await expect(
    page.getByRole('button', { name: 'Start', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `outputs/pc12/game-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});


test('contributions precede the output and both steps work with keyboard focus', async ({ page }, testInfo) => {
  await page.goto('/');
  const intro = page.getByRole('dialog');
  await expect(intro.getByRole('heading', { name: 'Two players. One remix.' })).toBeVisible();
  await expect(intro.getByText('PLAYER 1', { exact: true })).toBeVisible();
  await expect(intro.getByText('PLAYER 2', { exact: true })).toBeVisible();
  await expect(intro.getByRole('link', { name: 'Try simulated demo' })).toHaveCount(0);
  await intro.getByRole('button', { name: 'See the remix' }).click();
  await expect(intro.getByRole('heading', { name: 'Dino × Mario' })).toBeFocused();
  await page.screenshot({ path: `outputs/dino-v2/remix-output-${testInfo.project.name}.png` });
  await intro.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(intro.getByRole('heading', { name: 'Two players. One remix.' })).toBeFocused();
});
