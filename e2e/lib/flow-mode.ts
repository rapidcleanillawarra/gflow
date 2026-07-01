import type { Page } from '@playwright/test';

export type FlowMode = 'image' | 'video';

/** Video mode shows a button like "Video · 4s crop_9_16 x3". */
export function videoModeButton(page: Page) {
	return page.getByRole('button', { name: /^Video ·/ });
}

/** Image mode shows a Nano Banana model button. */
export function imageModeButton(page: Page) {
	return page.getByRole('button', { name: /Nano Banana/ });
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
		videoModeButton(page)
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
