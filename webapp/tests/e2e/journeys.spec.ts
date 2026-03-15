import { expect, test } from '@playwright/test';

const ARTICLE_TITLE = 'How I Split Local AI Across iPhone, Mac, and Cloud in PluckIt';

test('home → blog → article render', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Read Logs' }).click();

    await expect(page).toHaveURL('/blog');
    await expect(page.getByRole('heading', { name: /commit_log/i })).toBeVisible();

    await page.getByRole('link', { name: ARTICLE_TITLE }).click();
    await expect(page).toHaveURL('/blog/PluckIt-Apple');
    await expect(page.getByRole('heading', { name: ARTICLE_TITLE })).toBeVisible();
    await expect(page.getByRole('link', { name: '../back_to_log' })).toBeVisible();
});

test('projects filter search', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: /Shipped Code\./i })).toBeVisible();

    const searchInput = page.getByPlaceholder('grep search...');
    await searchInput.fill('PluckIt');
    await expect(page.getByRole('heading', { name: 'PluckIt' })).toBeVisible();

    await searchInput.fill('Nope');
    await expect(page.getByText('No projects found matching the filter.')).toBeVisible();

    await searchInput.fill('');
    await expect(page.getByRole('heading', { name: 'PluckIt' })).toBeVisible();
});

test('mobile menu opens and navigates', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');

    await page.getByRole('button', { name: 'menu' }).click();
    await expect(page.getByRole('link', { name: '_projects' })).toBeVisible();
    await page.getByRole('link', { name: '_projects' }).click();
    await expect(page).toHaveURL('/projects');
    await expect(page.getByRole('heading', { name: /Shipped Code\./i })).toBeVisible();
});
