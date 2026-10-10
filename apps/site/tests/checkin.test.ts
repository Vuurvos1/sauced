import { expect, test, type Page } from '@playwright/test';
import { TEST_SAUCE } from './global-setup';
import { createTestUser, login } from './fixtures';

// Reviews are left empty: any text loads the TensorFlow toxicity model, which is
// fetched over the network and takes seconds.

// The page is server-rendered, so a click can land before hydration attaches the
// handlers. Waiting for the network to settle covers the module graph in dev.
async function gotoSauce(page: Page) {
	await page.goto(`/sauces/${TEST_SAUCE.slug}`, { waitUntil: 'networkidle' });
}

async function reload(page: Page) {
	await page.reload({ waitUntil: 'networkidle' });
}

async function openCheckinDialog(page: Page) {
	await page.getByRole('button', { name: /check(ed)?-in/i }).click();
	return page.getByRole('dialog');
}

test.describe('check-in', () => {
	test('rating a sauce saves, prefills on edit and can be removed', async ({ page }) => {
		const testUser = await createTestUser({ verified: true });
		await login(page, testUser);
		await gotoSauce(page);

		let dialog = await openCheckinDialog(page);
		await dialog.getByRole('radio', { name: '4' }).check({ force: true });
		await dialog.getByRole('button', { name: 'Check-in' }).click();

		await expect(page.getByText('Check-in submitted successfully')).toBeVisible();
		await expect(dialog).toBeHidden();

		// The optimistic update is gone after a reload, so this is the stored row.
		await reload(page);
		const review = page.getByRole('listitem').filter({
			has: page.getByRole('link', { name: testUser.username })
		});
		await expect(review.getByText('(4.0)')).toBeVisible();

		dialog = await openCheckinDialog(page);
		await expect(dialog.getByRole('radio', { name: '4' })).toBeChecked();
		await dialog.getByRole('radio', { name: '2' }).check({ force: true });
		await dialog.getByRole('button', { name: 'Check-in' }).click();
		await expect(dialog).toBeHidden();

		await reload(page);
		await expect(review.getByText('(2.0)')).toBeVisible();

		await review.getByRole('button', { name: 'Remove review' }).click();
		await expect(page.getByText('Check-in removed successfully')).toBeVisible();

		await reload(page);
		await expect(review).toHaveCount(0);
	});

	test('submitting without a rating shows an error', async ({ page }) => {
		const testUser = await createTestUser({ verified: true });
		await login(page, testUser);
		await gotoSauce(page);

		const dialog = await openCheckinDialog(page);
		await dialog.getByRole('button', { name: 'Check-in' }).click();

		await expect(dialog.getByText('Please enter a valid rating')).toBeVisible();
	});
});
