import { expect, test } from '@playwright/test';

const FILTER_LABELS = [
  'Behavior',
  'System family',
  'Genre',
  'Platform',
  'Loop timescale',
  'Play context',
  'Complexity',
  'Dependency',
  'Risk',
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: 'Start with a game. Leave with a testable mechanic.',
    }),
  ).toBeVisible();
});

test('search reports concrete matches and supports keyboard reset', async ({
  page,
}) => {
  const search = page.getByRole('searchbox');

  await page.keyboard.press('/');
  await expect(search).toBeFocused();
  await search.fill('roguelite');
  await expect(page.getByRole('heading', { name: '2 matches' })).toBeVisible();
  await expect(page.getByText('Genre: Roguelite', { exact: true })).toHaveCount(
    2,
  );

  await page.keyboard.press('Escape');
  await expect(search).toHaveValue('');
  await expect(page.getByRole('heading', { name: '10 matches' })).toBeVisible();
});

test('every discovery filter can be applied, removed, and reset', async ({
  page,
}) => {
  await page.getByText('More filters · 7', { exact: true }).click();
  const filters = page.locator('.filter-grid select');
  await expect(filters).toHaveCount(FILTER_LABELS.length);

  for (const [index, label] of FILTER_LABELS.entries()) {
    const filter = filters.nth(index);
    const value = await filter
      .locator('option:not([value=""])')
      .first()
      .getAttribute('value');

    expect(value).toBeTruthy();
    await filter.selectOption(value!);
    await expect(page.getByText('1 active', { exact: true })).toBeVisible();

    const remove = page.getByRole('button', {
      name: new RegExp(`^Remove ${label} filter:`),
    });
    await expect(remove).toBeVisible();
    await remove.click();
    await expect(
      page.getByRole('heading', { name: '10 matches' }),
    ).toBeVisible();
  }

  await filters.nth(FILTER_LABELS.indexOf('Risk')).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Reset all' }).click();
  await expect(page.getByText('1 active', { exact: true })).toHaveCount(0);
});

test('empty results recover without inventing references', async ({ page }) => {
  await page.getByRole('searchbox').fill('teleport through economy');
  await expect(page.getByRole('heading', { name: '0 matches' })).toBeVisible();
  await expect(
    page.getByText('No implementation matches this combination yet.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Reset search and filters' }).click();
  await expect(page.getByRole('heading', { name: '10 matches' })).toBeVisible();
});

test('cards distinguish sourced facts from product synthesis', async ({
  page,
}) => {
  await expect(page.getByText('Sourced summary', { exact: true })).toHaveCount(
    10,
  );
  await expect(
    page.getByText('Product synthesis', { exact: true }),
  ).toHaveCount(30);
  await expect(page.locator('.reference-card__actions > a')).toHaveCount(20);
  await expect(page.getByRole('link', { name: /Open breakdown/ })).toHaveCount(
    10,
  );
  await expect(page.getByText('Run Simulation', { exact: true })).toHaveCount(
    0,
  );
});

test('game-first and behavior-first paths converge on the dash breakdown', async ({
  page,
}) => {
  await page
    .getByRole('link', { name: /Returnal.*2 mechanic breakdowns/ })
    .click();
  await expect(page).toHaveURL(/\/games\/returnal$/);
  await expect(page.getByRole('heading', { name: 'Returnal' })).toBeVisible();

  const dashCard = page.locator('.mechanic-list-card').filter({
    hasText: 'Projectile-phasing dash',
  });
  await dashCard.getByRole('link', { name: 'Open mechanic breakdown' }).click();
  await expect(page).toHaveURL(/\/mechanics\/returnal-projectile-dash$/);
  await expect(
    page.getByRole('heading', { name: 'Projectile-phasing dash' }),
  ).toBeVisible();
  await expect(
    page.getByText('From the source', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Forge interpretation', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Your decision', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Adapt this mechanic' }).first().click();
  await expect(page).toHaveURL(/\/forge\/dash$/);
  await expect(page.getByRole('textbox', { name: 'Design goal' })).toHaveValue(
    'Reward aggressive movement without increasing weapon damage.',
  );
  await expect(
    page.getByRole('heading', {
      name: 'One rule changes. Everything else stays matched.',
    }),
  ).toBeVisible();
  await expect(
    page
      .getByText('Experiment baseline · Forge-defined', { exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'On enemy elimination' }),
  ).toBeVisible();
});

test('dash adaptation remains a one-rule diff and exports its trust boundary', async ({
  page,
}) => {
  await page.goto('/forge/dash');

  const goal = page.getByRole('textbox', { name: 'Design goal' });
  await goal.fill('Reward committed movement through projectile pressure.');
  await page
    .getByLabel('Variant B · Your decision')
    .selectOption('projectile-crossing');

  await expect(page.locator('.experiment-count strong')).toHaveText('1');
  await expect(
    page.getByText('After a successful projectile crossing', { exact: true }),
  ).toHaveCount(2);
  await expect(page.getByText('Returnal control', { exact: true })).toHaveCount(
    0,
  );

  await page.getByRole('button', { name: 'Save experiment contract' }).click();
  await expect(
    page.getByText('Saved in this session', { exact: true }),
  ).toBeVisible();

  const markdownDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown' }).click();
  expect((await markdownDownload).suggestedFilename()).toBe(
    'dash-aggression-loop.md',
  );

  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON' }).click();
  expect((await jsonDownload).suggestedFilename()).toBe(
    'dash-aggression-loop.json',
  );
});

test('saved dash contract becomes a deterministic preview-only A/B microplay', async ({
  page,
}) => {
  await page.goto('/forge/dash');
  await page
    .getByLabel('Variant B · Your decision')
    .selectOption('projectile-crossing');
  await page.getByRole('button', { name: 'Save experiment contract' }).click();
  await page.getByRole('link', { name: 'Preview matched A/B' }).click();

  await expect(page).toHaveURL(
    /\/microplays\/dash\/preview\?.*mutation=projectile-crossing/,
  );
  await expect(
    page.getByRole('heading', {
      name: 'Feel the rule change before you share it.',
    }),
  ).toBeVisible();
  await expect(
    page.getByText('Events are excluded from evidence.'),
  ).toBeVisible();
  await expect(
    page.getByText('Same arena · seed 4127 · one rule changed'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '1 · Control A' }),
  ).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Start 45-second preview' }).click();
  await page.getByRole('button', { name: 'Dash · Space' }).click();
  await expect(
    page.getByText('Dash attempts').locator('..').locator('strong'),
  ).toHaveText('1');
  await expect(page.getByText('Not evidence', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Reset same seed' }).click();
  await expect(
    page.getByText('Start Control A', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('45 seconds remaining')).toBeVisible();

  await page.getByRole('button', { name: '2 · Variant B' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'After a successful projectile crossing',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: '2 · Variant B' }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('a behavior suggestion focuses its filtered result set', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Move through danger' }).click();
  await expect(page.getByRole('heading', { name: '1 match' })).toBeVisible();
  await expect(page.locator('.results-heading')).toBeFocused();

  await page.getByRole('link', { name: 'Open breakdown' }).click();
  await expect(page).toHaveURL(/\/mechanics\/returnal-projectile-dash$/);
});

test('layout stays operable without horizontal overflow', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Explore' })).toBeVisible();

  for (const route of [
    '/',
    '/games/returnal',
    '/mechanics/returnal-projectile-dash',
    '/forge/dash',
    '/microplays/dash/preview',
  ]) {
    await page.goto(route);
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow, `${route} should fit the viewport`).toBe(false);
  }
});
