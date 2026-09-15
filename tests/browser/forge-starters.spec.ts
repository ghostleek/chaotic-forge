import { test, expect } from '@playwright/test';
test('starters prefill, explain API access and require explicit confirmation', async ({
  page,
}) => {
  // UI-only access fixture; starter selection does not call a model.
  await page.route('**/api/forge/access', route => route.fulfill({ json: { csrf: 'local-test', billing: { admin: true, hasKey: false, trial: false, remaining: 0, email: 'fixture@example.com', userId: 'fixture' } } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip introduction' }).click();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Starter test');
  await page.getByRole('button', { name: 'Create room', exact: true }).click();
  await page.getByRole('button', { name: 'Create live room', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Your instruction' }),
  ).toBeVisible();
  await page
    .getByText('Need an idea? Pick a starter.', { exact: true })
    .click();
  const snake = page.getByRole('button', { name: /^Snake Growing snake/ });
  await expect(snake).toHaveAttribute('title', /no API call/);
  await snake.click();
  await expect(
    page.getByRole('textbox', { name: 'Your instruction' }),
  ).toHaveValue('Snake');
  await expect(
    page.getByRole('button', { name: 'Confirm instruction', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Bounce Custom platform/ }).click();
  await expect(
    page.getByRole('textbox', { name: 'Your instruction' }),
  ).toHaveValue(
    'Bounce a ball between platforms and collect food. Steer left and right.',
  );
  await expect(
    page.getByText(/Custom platform movement\. Requires/),
  ).toBeVisible();
});
