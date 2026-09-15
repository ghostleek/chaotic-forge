import { test, expect } from '@playwright/test';
import jsQR from 'jsqr';

test('room invitation copies, decodes to a joinable URL, and remains usable without clipboard access', async ({
  page,
  context,
  browser,
}, testInfo) => {
  // Funding fixture only. Room enrollment uses the real local Worker and D1.
  await page.route('**/api/forge/access', (route) =>
    route.fulfill({
      json: {
        csrf: 'test',
        billing: {
          admin: true,
          hasKey: false,
          trial: false,
          remaining: 0,
          email: 'fixture@example.com',
          userId: 'fixture',
        },
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create room', exact: true }),
  ).toBeInViewport();
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Invite host');
  await page.getByRole('button', { name: 'Create room', exact: true }).click();
  await page
    .getByRole('button', { name: 'Create live room', exact: true })
    .click();
  await expect(
    page.getByText('1 player joined · 1 more needed to start', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Got it', exact: true }),
  ).not.toBeVisible();
  await expect(page).toHaveTitle('Room · Chaotic Forge');
  const roomUrl = page.url();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page
    .getByRole('button', { name: 'Copy invite link', exact: true })
    .click();
  await expect(
    page.getByText('Invite link copied. Share it with your friends.', {
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    roomUrl,
  );
  const trigger = page.getByRole('button', { name: 'QR code', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', {
    name: 'Join this room',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('textbox', { name: 'Room invite link' }),
  ).toHaveValue(roomUrl);
  // Decode the actual rendered symbol, not the React prop or a mock QR image.
  const pixels = await dialog
    .locator('svg')
    .filter({ has: page.locator('title') })
    .evaluate(async (svg) => {
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0, 256, 256);
      return Array.from(ctx.getImageData(0, 0, 256, 256).data);
    });
  const decoded = jsQR(new Uint8ClampedArray(pixels), 256, 256);
  expect(decoded?.data).toBe(roomUrl);
  await dialog.screenshot({
    path: `outputs/usability/qr-${testInfo.project.name}.png`,
  });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(trigger).toBeFocused();

  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    }),
  );
  await page
    .getByRole('button', { name: 'Copy invite link', exact: true })
    .click();
  await expect(
    page.getByText(
      'Could not copy automatically. Select and copy the link below.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Room invite link' }),
  ).toHaveValue(roomUrl);

  const guestContext = await browser.newContext();
  try {
    const guest = await guestContext.newPage();
    await guest.goto(decoded!.data);
    await guest.getByRole('textbox', { name: 'Your name' }).fill('QR guest');
    await guest.getByRole('button', { name: 'Join room', exact: true }).click();
    await expect(
      page.getByText('2 players joined · Enough players to start', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      guest.getByRole('textbox', { name: 'Your instruction' }),
    ).toBeVisible();
  } finally {
    await guestContext.close();
  }
});

test('shared header, visible controls and help remain consistent across navigation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.getByRole('link', { name: /Try Dino/ }).click();
  await expect(
    page.getByRole('link', { name: 'Chaotic Forge home', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Space to jump · Esc to pause · or use the buttons below.', {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Chaotic Forge home', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Got it', exact: true }),
  ).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  for (const path of ['/play/snake-space-invaders', '/forge/create']) {
    await page.goto(path);
    await expect(
      page.getByRole('link', { name: 'Chaotic Forge home', exact: true }),
    ).toBeVisible();
  }
});
