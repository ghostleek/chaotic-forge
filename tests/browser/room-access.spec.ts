import { test, expect } from '@playwright/test';

test('room creation requests access only after intent; banner is absent', async ({ page }) => {
  let checks = 0;
  await page.route('**/api/forge/access', async route => { checks++; await route.fulfill({ status: 401, json: { error: 'Sign in' } }); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip introduction' }).click();
  await expect(page.getByRole('navigation', { name: 'Creator access' })).toHaveCount(0);
  await expect(page.locator('a[href="/explore"]')).toHaveCount(0);
  expect(checks).toBe(0);
  await page.getByRole('textbox', { name: 'Your name' }).fill('Host');
  await page.getByRole('button', { name: 'Create room', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Sign in with ChatGPT' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create live room', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Your name' })).toHaveValue('Host');
});

test('sign-in return restores setup and requires API funding', async ({ page }) => {
  await page.route('**/api/forge/access', route => route.fulfill({ json: { csrf: 'test', billing: { admin: false, hasKey: false, trial: false, remaining: 0, email: 'test@example.com', userId: 'test' } } }));
  await page.goto('/?startRoom=1&nickname=Host');
  await page.getByRole('button', { name: 'Skip introduction' }).click();
  await expect(page.getByRole('heading', { name: 'Bring your own API key' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create live room', exact: true })).toBeDisabled();
});

for (const admin of [false, true]) {
  test(`${admin ? 'admin' : 'saved key'} access lets host create a room`, async ({ page }) => {
    await page.route('**/api/forge/access', route => route.fulfill({ json: { csrf: 'test', billing: { admin, hasKey: !admin, trial: false, remaining: 0, email: 'test@example.com', userId: 'test' } } }));
    let creations = 0;
    await page.route('**/api/party/rooms', async route => {
      if (route.request().method() === 'POST') creations++;
      await route.fulfill({ status: 503, json: { error: 'Test stops before creating a room' } });
    });
    await page.goto('/?startRoom=1&nickname=Host');
  await page.getByRole('button', { name: 'Skip introduction' }).click();
    const create = page.getByRole('button', { name: 'Create live room', exact: true });
    await expect(create).toBeEnabled();
    expect(creations).toBe(0);
    await create.click();
    await expect.poll(() => creations).toBe(1);
    await expect(page.getByRole('link', { name: 'Sign out', exact: true })).toHaveAttribute('href', /startRoom%3D1/);
  });
}
