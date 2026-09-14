import { test, expect } from '@playwright/test';
test('public saved remix plays without a creator request and restarts', async ({
  page,
}) => {
  const calls: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) calls.push(r.url());
  });
  await page.goto('/play/snake-space-invaders');
  await expect(page.getByText('SAVED REMIX · NO API USAGE')).toBeVisible();
  await page.getByRole('button', { name: 'Play demo', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Eat 10. Blast 25.');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-runtime', 'pixel-arcade-v2');
  await expect(page.getByTestId('snake-lives')).toHaveText('3');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-shots')))
    .toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('status')).toContainText('Paused');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Eat 10. Blast 25.');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Paused');
  const tick = await canvas.getAttribute('data-tick');
  await page.waitForTimeout(150);
  await expect(canvas).toHaveAttribute('data-tick', tick!);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('button', { name: 'Steer left', exact: true }).focus();
  await page.keyboard.down('Enter');
  await page.waitForTimeout(200);
  await page.keyboard.up('Enter');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-tick')))
    .toBeGreaterThan(Number(tick));
  expect(calls).toEqual([]);
});
test('creator requires ChatGPT sign-in while demo stays public', async ({
  page,
}) => {
  await page.goto('/forge/create');
  await expect(
    page.getByRole('link', { name: 'Sign in with ChatGPT →' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Play the public demo without signing in' }),
  ).toBeVisible();
});
