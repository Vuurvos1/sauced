import { expect, test } from '@playwright/test';
import { CANONICAL_USER } from './global-setup';
import { createTestUser } from './fixtures';

test.describe('login', () => {
	test('verified user with correct credentials reaches the home page', async ({ page }) => {
		await page.goto('/login');

		await page.getByLabel('Email').fill(CANONICAL_USER.email);
		await page.getByLabel('Password').fill(CANONICAL_USER.password);
		await page.getByRole('button', { name: 'Continue' }).click();

		await expect(page).toHaveURL('/');

		// Verify the session survives a reload — cookie was actually set.
		await page.reload();
		await expect(page).toHaveURL('/');
	});

	test('wrong password shows an error and stays on /login', async ({ page }) => {
		await page.goto('/login');

		await page.getByLabel('Email').fill(CANONICAL_USER.email);
		await page.getByLabel('Password').fill('WrongPassword123');
		await page.getByRole('button', { name: 'Continue' }).click();

		await expect(page.getByText(/invalid email or password/i)).toBeVisible();
		await expect(page).toHaveURL(/\/login$/);
	});

	test('unverified user sees "verify your email" message', async ({ page }) => {
		const unverified = await createTestUser({ verified: false });

		await page.goto('/login');
		await page.getByLabel('Email').fill(unverified.email);
		await page.getByLabel('Password').fill(unverified.password);
		await page.getByRole('button', { name: 'Continue' }).click();

		await expect(page.getByText(/you must verify your email/i)).toBeVisible();
		await expect(page).toHaveURL(/\/login$/);
	});

	test('input without @ shows "invalid email"', async ({ page }) => {
		await page.goto('/login');

		await page.getByLabel('Email').fill('not-an-email');
		await page.getByLabel('Password').fill('TestPassword123');
		await page.getByRole('button', { name: 'Continue' }).click();

		await expect(page.getByText(/invalid email/i)).toBeVisible();
	});

	test('blank password shows "password is required"', async ({ page }) => {
		await page.goto('/login');

		await page.getByLabel('Email').fill(CANONICAL_USER.email);
		// Leave password empty. The HTML `required` attribute would normally block
		// submission, so remove it to reach the server/zod branch.
		await page.evaluate(() => {
			document
				.querySelector<HTMLInputElement>('input[name="password"]')
				?.removeAttribute('required');
		});
		await page.getByRole('button', { name: 'Continue' }).click();

		await expect(page.getByText(/password is required/i)).toBeVisible();
	});
});
