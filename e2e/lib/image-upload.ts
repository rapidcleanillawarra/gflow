import type { FilePayload, Page } from '@playwright/test';

export type RemoteImage = {
	name: string;
	mimeType: string;
	buffer: Buffer;
};

function fileNameFromUrl(url: string): string {
	const pathname = new URL(url).pathname;
	const base = pathname.split('/').pop();
	return base && base.includes('.') ? base : 'image.png';
}

function mimeTypeFromName(name: string): string {
	const ext = name.split('.').pop()?.toLowerCase();
	switch (ext) {
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'webp':
			return 'image/webp';
		case 'gif':
			return 'image/gif';
		default:
			return 'image/png';
	}
}

/** Download image bytes from a public or signed Supabase URL. */
export async function fetchImageFromUrl(url: string): Promise<RemoteImage> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to download image (${response.status}): ${url}`);
	}

	const buffer = Buffer.from(await response.arrayBuffer());
	const name = fileNameFromUrl(url);
	const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? mimeTypeFromName(name);

	return { name, mimeType, buffer };
}

function toPlaywrightFile(image: RemoteImage): FilePayload {
	return {
		name: image.name,
		mimeType: image.mimeType,
		buffer: image.buffer
	};
}

/** Set files on a visible <input type="file">. */
export async function uploadImageToFileInput(
	page: Page,
	input: ReturnType<Page['locator']>,
	imageUrl: string
): Promise<RemoteImage> {
	const image = await fetchImageFromUrl(imageUrl);
	await input.setInputFiles(toPlaywrightFile(image));
	return image;
}

/**
 * Click a Flow upload control that opens the native file picker, then upload the image.
 * Pass the same click Playwright codegen recorded for Nano Banana upload.
 */
export async function uploadImageViaFileChooser(
	page: Page,
	imageUrl: string,
	openFilePicker: () => Promise<void>
): Promise<RemoteImage> {
	const image = await fetchImageFromUrl(imageUrl);

	const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), openFilePicker()]);
	await fileChooser.setFiles(toPlaywrightFile(image));

	return image;
}
