import { expect, test } from '@playwright/test';

test('home page has h1 and sauce sections', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h2').first()).toBeVisible();
});
