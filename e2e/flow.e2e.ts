import { expect, test } from '@playwright/test';
import { getProfileUrl, hasFlowProfile, loadProfileConfig } from './lib/profile-config.ts';

const profile = loadProfileConfig();

test.describe('Google Flow', () => {
	test.skip(!hasFlowProfile(), 'Save the veo3 profile at /cookies first.');

	test('opens Flow project with saved cookies', async ({ page }) => {
		if (process.env.PW_PAUSE) await page.pause();

		await page.goto(getProfileUrl(), {
			waitUntil: 'domcontentloaded',
			timeout: 60_000
		});

		await expect(page).not.toHaveURL(/accounts\.google\.com/i);
		await expect(page).toHaveURL(/labs\.google\/fx\/tools\/flow/i);

		await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);

		const title = await page.title();
		expect(title.length).toBeGreaterThan(0);

		console.log(`Opened Flow as profile "${profile.name}": ${page.url()}`);

		if (process.env.PW_PAUSE) await page.pause();
	});
});
