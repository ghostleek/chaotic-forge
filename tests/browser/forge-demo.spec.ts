import { test, expect } from '@playwright/test';
test('public authored demo plays without a creator request and restarts', async ({
  page,
}) => {
  const calls: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/forge')) calls.push(r.url());
  });
  await page.goto('/play/snake-space-invaders');
  await expect(page.getByText('AUTHORED DEMO · NO CODE NEEDED')).toBeVisible();
  await page.getByRole('button', { name: 'Play demo', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Clear the fleet');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('status')).toContainText('Paused');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Clear the fleet');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Paused');
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
