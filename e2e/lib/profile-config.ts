import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { sanitizeProfileName, type CookieProfileManifest } from '../../src/lib/playwright-cookies.ts';

export type ProfileConfig = {
	name: string;
	url?: string;
	storageStatePath?: string;
};

const authDir = 'e2e/.auth';

export function loadProfileConfig(profileName?: string): ProfileConfig {
	const profile = sanitizeProfileName(profileName ?? process.env.PLAYWRIGHT_COOKIE_PROFILE ?? 'default');
	const storageStatePath = path.join(authDir, `${profile}.json`);
	const manifestPath = path.join(authDir, 'manifest.json');

	let url: string | undefined;
	let name = profile;

	if (existsSync(manifestPath)) {
		try {
			const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as CookieProfileManifest;
			const entry = manifest.profiles.find(
				(item) => sanitizeProfileName(item.name) === profile
			);

			if (entry) {
				name = entry.name;
				url = entry.url;
			}
		} catch {
			// ignore invalid manifest
		}
	}

	return {
		name,
		url,
		storageStatePath: existsSync(storageStatePath) ? storageStatePath : undefined
	};
}

export function getProfileUrl(profileName?: string): string {
	const profile = loadProfileConfig(profileName);

	if (!profile.url) {
		throw new Error(
			'No URL saved for this cookie profile. Add one at /cookies or set PLAYWRIGHT_COOKIE_PROFILE.'
		);
	}

	return profile.url;
}

export function getProfileOrigin(url: string): string {
	return new URL(url).origin;
}
