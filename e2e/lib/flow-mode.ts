import type { Page } from '@playwright/test';

export type FlowMode = 'image' | 'video';

export type FlowLayout =
	| { mode: 'image' }
	| { mode: 'video'; frameInput: boolean };

/** Video mode shows a button like "Video · 4s crop_9_16 1x". */
export function videoSettingsButton(page: Page) {
	return page.getByRole('button', { name: /^Video ·/ });
}

/** @deprecated Use {@link videoSettingsButton} */
export function videoModeButton(page: Page) {
	return videoSettingsButton(page);
}

/** Image mode shows a Nano Banana model button. */
export function imageModeButton(page: Page) {
	return page.getByRole('button', { name: /Nano Banana/ });
}

export function framesTab(page: Page) {
	return page.getByRole('tab', { name: 'crop_free Frames' });
}

export function isImageMode(mode: FlowMode): boolean {
	return mode === 'image';
}

export function isVideoMode(mode: FlowMode): boolean {
	return mode === 'video';
}

/**
 * Waits until Flow shows either a Video or Nano Banana model button, then returns the mode.
 */
export async function detectFlowMode(page: Page, timeout = 30_000): Promise<FlowMode> {
	const mode = await Promise.race([
		videoSettingsButton(page)
			.first()
			.waitFor({ state: 'visible', timeout })
			.then(() => 'video' as const),
		imageModeButton(page)
			.first()
			.waitFor({ state: 'visible', timeout })
			.then(() => 'image' as const)
	]).catch(() => null);

	if (mode) return mode;

	throw new Error(
		'Could not detect Flow mode. Expected a "Video · …" button (video) or a "Nano Banana …" button (image).'
	);
}

/** Opens the video settings panel. Required before checking frame input UI. */
export async function openVideoSettings(page: Page, timeout = 30_000): Promise<void> {
	const button = videoSettingsButton(page).first();
	await button.waitFor({ state: 'visible', timeout });
	await button.click();
}

/**
 * Returns true when the Frames tab and frame-input controls are visible.
 * Call {@link openVideoSettings} first when starting from the main Flow view.
 */
export async function detectFrameInputMode(page: Page, timeout = 10_000): Promise<boolean> {
	const markers = [
		framesTab(page),
		page.getByText('Start', { exact: true }),
		page.getByText('End'),
		page.getByRole('button', { name: /swap_horiz Swap first and/ })
	];

	try {
		await Promise.all(
			markers.map((locator) => locator.first().waitFor({ state: 'visible', timeout }))
		);
		return true;
	} catch {
		return false;
	}
}

/**
 * Detects image vs video mode. In video mode, opens settings and checks for frame input.
 */
export async function detectFlowLayout(page: Page, timeout = 30_000): Promise<FlowLayout> {
	const mode = await detectFlowMode(page, timeout);

	if (mode === 'image') {
		return { mode: 'image' };
	}

	await openVideoSettings(page, timeout);
	const frameInput = await detectFrameInputMode(page);

	return { mode: 'video', frameInput };
}
