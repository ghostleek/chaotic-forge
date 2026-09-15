import { test, expect } from '@playwright/test';

test('introduction opens on request and remains dismissed on reload', async ({
  page,
}) => {
  await page.goto('/');
  const intro = page.getByRole('dialog');
  await expect(intro).not.toBeVisible();
  await page.getByRole('button', { name: 'How this remix works' }).click();
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
  await page.getByRole('button', { name: 'How this remix works' }).click();
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
  await page.getByRole('button', { name: 'How this remix works' }).click();
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
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  const beforeBlur = Number(await canvas.getAttribute('data-tick'));
  await canvas.evaluate(el => (el as HTMLCanvasElement).blur());
  await expect.poll(async () => Number(await canvas.getAttribute('data-tick'))).toBeGreaterThan(beforeBlur);
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
  await expect(page.getByLabel('Dino Mario course.', { exact: false })).toBeFocused();
  expect(Number(await page.getByLabel('Dino Mario course.', { exact: false }).getAttribute('data-feet'))).toBeLessThan(258);
});

test('the browser continues beyond 30 seconds and 2x, then restart resets speed', async ({
  page,
}) => {
  await page.goto('/play/dino-mario');
  await expect(
    page.getByRole('button', { name: 'Start', exact: true }),
  ).toBeVisible();
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const canvas = page.getByLabel('Dino Mario course.', { exact: false });
  await expect(page.getByTestId('speed')).toHaveText('1.00×');
  await expect(page.getByLabel('Red spike trap', { exact: true })).toBeVisible();
  let tick = 0;
  for (const press of [133, 276, 471, 580, 788, 889, 1058, 1385, 1459, 1612, 1671, 1831]) {
    if (press === 1612) {
      await page.clock.runFor(((1581 - tick) * 1000) / 60 + 0.05);
      tick = 1581;
      await expect(canvas).toHaveAttribute('data-beam-ticks', '120');
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.clock.runFor(500);
      await expect(canvas).toHaveAttribute('data-beam-ticks', '120');
      await page.screenshot({ path: 'outputs/dino-beam/beam.png' });
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
    }
    await page.clock.runFor(((press - tick) * 1000) / 60 + 0.05);
    await expect(canvas).toHaveAttribute('data-tick', String(press));
    if (press === 276 || press === 580) await canvas.screenshot({ path: `outputs/dino-pterodactyl/mode-${press}.png` });
    await page.keyboard.down('Space');
    await page.clock.runFor(1000 / 60 + 0.05);
    await page.keyboard.up('Space');
    tick = press + 1;
  }
  await page.clock.runFor(((1860 - tick) * 1000) / 60 + 0.05);
  await expect(canvas).toHaveAttribute('data-status', 'playing');
  await expect(page.getByTestId('stomps')).toHaveText('5');
  await expect(canvas).toHaveAttribute('data-growth', '2');
  await expect(canvas).toHaveAttribute('data-beam-ticks', '0');
  expect(Number(await canvas.getAttribute('data-beam-destroyed'))).toBeGreaterThan(0);
  await expect(page.getByTestId('speed')).toHaveText('2.03×');
  await page.screenshot({ path: 'outputs/dino-growth/final-stage.png' });
  await page.clock.runFor(1000);
  await expect(canvas).toHaveAttribute('data-tick', '1920');
  await expect(page.getByTestId('speed')).toHaveText('2.07×');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-tick', '0');
  await expect(canvas).toHaveAttribute('data-growth', '0');
  await expect(canvas).toHaveAttribute('data-beam-ticks', '0');
  await expect(canvas).toHaveAttribute('data-beam-destroyed', '0');
  await expect(page.getByTestId('speed')).toHaveText('1.00×');
  await expect(page.getByTestId('stomps')).toHaveText('0');
  await page.clock.runFor(30000);
  await expect(canvas).toHaveAttribute('data-status', 'lost');
});

test('introduction and controls fit a narrow reduced-motion viewport', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'How this remix works' }).click();
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
  await page.getByRole('button', { name: 'How this remix works' }).click();
  const intro = page.getByRole('dialog');
  await expect(intro.getByRole('heading', { name: 'Two players. One remix.' })).toBeVisible();
  await expect(intro.getByText('PLAYER 1', { exact: true })).toBeVisible();
  await expect(intro.getByText('PLAYER 2', { exact: true })).toBeVisible();
  await expect(intro.getByRole('link', { name: 'Try simulated demo' })).toHaveCount(0);
  await intro.getByRole('button', { name: 'See the remix' }).click();
  await expect(intro.getByRole('heading', { name: 'Dino × Mario' })).toBeFocused();
  await expect(intro.getByLabel('Growth preview:', { exact: false })).toHaveAttribute('data-sprites-ready', 'true');
  await expect(intro.getByText('eat meat to grow twice', { exact: false })).toBeVisible();
  await page.screenshot({ path: `outputs/dino-v2/remix-output-${testInfo.project.name}.png` });
  await intro.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(intro.getByRole('heading', { name: 'Two players. One remix.' })).toBeFocused();
});


test('missing sprite assets prevent invisible gameplay and show a retry instruction', async ({ page }) => {
  await page.route('**/party-forge/dino/pterodactyl-v1.png', route => route.abort());
  await page.goto('/play/dino-mario');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Sprites could not load');
  await expect(page.getByLabel('Dino Mario course.', { exact: false })).toHaveAttribute('data-tick', '0');
});

test('grown Dino alternates its visible legs while its body remains stable', async ({ page }, testInfo) => {
  await page.goto('/play/dino-mario');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeEnabled();
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  let tick = 0;
  for (const press of [133, 276]) {
    await page.clock.runFor((press - tick) * 1000 / 60 + 0.05);
    await page.keyboard.down('Space'); await page.clock.runFor(1000 / 60 + 0.05);
    await page.keyboard.up('Space'); tick = press + 1;
  }
  await page.clock.runFor((471 - tick) * 1000 / 60 + 0.05);
  const canvas = page.getByLabel('Dino Mario course.', { exact: false });
  await expect(canvas).toHaveAttribute('data-growth', '2');
  await expect(canvas).toHaveAttribute('data-feet', '258.00');
  const pixels = () => canvas.evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext('2d')!;
    return { body: Array.from(ctx.getImageData(80, 194, 96, 43).data),
      legs: Array.from(ctx.getImageData(80, 241, 96, 17).data) };
  });
  const first = await pixels();
  await canvas.screenshot({ path: `outputs/dino-beam/stride-a-${testInfo.project.name}.png` });
  await page.clock.runFor(100 + 0.05);
  const second = await pixels();
  // Browser canvas readback can vary a channel by one level around translucent pixels.
  const difference = (a: number[], b: number[]) => a.reduce((sum, value, i) => sum + Math.abs(value - b[i]), 0) / a.length;
  // Compare against the stationary body as a control for GPU/readback variation.
  expect(difference(second.legs, first.legs)).toBeGreaterThan(difference(second.body, first.body) * 1.5);
  await canvas.screenshot({ path: `outputs/dino-beam/stride-b-${testInfo.project.name}.png` });
});

test('visible focus changes keep running, while a hidden tab pauses without advancing', async ({ page }) => {
  await page.goto('/play/dino-mario');
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const canvas = page.getByLabel('Dino Mario course.', { exact: false });
  await page.getByRole('heading', { name: 'Run. Eat.' , exact: false }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.clock.runFor(1000);
  const beforeHidden = Number(await canvas.getAttribute('data-tick'));
  expect(beforeHidden).toBeGreaterThan(50);
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.clock.runFor(1000);
  await expect(canvas).toHaveAttribute('data-tick', String(beforeHidden));
  await page.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(1000);
  expect(Number(await canvas.getAttribute('data-tick'))).toBeGreaterThan(beforeHidden + 50);
});
