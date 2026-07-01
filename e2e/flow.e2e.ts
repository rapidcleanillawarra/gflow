import { expect, test, type Page } from '@playwright/test';
import { detectFlowMode } from './lib/flow-mode.ts';
import { getProfileUrl, hasFlowProfile, loadProfileConfig } from './lib/profile-config.ts';

const profile = loadProfileConfig();

async function openFlow(page: Page) {
	await page.goto(getProfileUrl(), {
		waitUntil: 'domcontentloaded',
		timeout: 60_000
	});

	await expect(page).not.toHaveURL(/accounts\.google\.com/i);
	await expect(page).toHaveURL(/labs\.google\/fx\/tools\/flow/i);

	await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
}

test.describe('Google Flow', () => {
	test.skip(!hasFlowProfile(), 'Save the veo3 profile at /cookies first.');

	test('opens Flow project with saved cookies', async ({ page }) => {
		if (process.env.PW_PAUSE) await page.pause();

		await openFlow(page);

		const title = await page.title();
		expect(title.length).toBeGreaterThan(0);

		console.log(`Opened Flow as profile "${profile.name}": ${page.url()}`);

		if (process.env.PW_PAUSE) await page.pause();
	});

	test('detects image or video mode', async ({ page }) => {
		await openFlow(page);

		const mode = await detectFlowMode(page);
		expect(['image', 'video']).toContain(mode);

		console.log(`Flow is in ${mode} mode`);
	});
});
