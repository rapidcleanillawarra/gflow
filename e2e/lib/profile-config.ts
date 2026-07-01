import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { sanitizeProfileName, type CookieProfileManifest } from '../../src/lib/playwright-cookies.ts';

export type ProfileConfig = {
	name: string;
	url?: string;
	storageStatePath?: string;
};

const authDir = 'e2e/.auth';

function readManifest(): CookieProfileManifest | null {
	const manifestPath = path.join(authDir, 'manifest.json');

	if (!existsSync(manifestPath)) return null;

	try {
		return JSON.parse(readFileSync(manifestPath, 'utf-8')) as CookieProfileManifest;
	} catch {
		return null;
	}
}

function findManifestEntry(manifest: CookieProfileManifest, slug: string) {
	return manifest.profiles.find((item) => sanitizeProfileName(item.name) === slug);
}

export function loadProfileConfig(profileName?: string): ProfileConfig {
	const requested = sanitizeProfileName(profileName ?? process.env.PLAYWRIGHT_COOKIE_PROFILE ?? 'default');
	const manifest = readManifest();
	let slug = requested;
	let entry = manifest ? findManifestEntry(manifest, slug) : undefined;

	if (!entry && manifest?.profiles.length === 1) {
		entry = manifest.profiles[0];
		slug = sanitizeProfileName(entry.name);
	}

	const storageStatePath = path.join(authDir, `${slug}.json`);

	return {
		name: entry?.name ?? slug,
		url: entry?.url,
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

export function hasFlowProfile(): boolean {
	const profile = loadProfileConfig();
	return Boolean(profile.storageStatePath && profile.url);
}
