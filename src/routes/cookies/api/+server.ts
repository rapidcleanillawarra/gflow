import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { parseNetscapeCookieFile } from '$lib/netscape-cookies';
import {
	getStorageStatePath,
	normalizeProfileUrl,
	PLAYWRIGHT_AUTH_DIR,
	PLAYWRIGHT_MANIFEST_PATH,
	sanitizeProfileName,
	toPlaywrightStorageState,
	type CookieProfile,
	type CookieProfileManifest
} from '$lib/playwright-cookies';
import type { RequestHandler } from './$types';

const authDir = () => path.join(process.cwd(), PLAYWRIGHT_AUTH_DIR);
const manifestPath = () => path.join(process.cwd(), PLAYWRIGHT_MANIFEST_PATH);

async function readManifest(): Promise<CookieProfileManifest> {
	try {
		const raw = await readFile(manifestPath(), 'utf-8');
		return JSON.parse(raw) as CookieProfileManifest;
	} catch {
		return { profiles: [] };
	}
}

async function writeManifest(manifest: CookieProfileManifest): Promise<void> {
	await mkdir(authDir(), { recursive: true });
	await writeFile(manifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
}

export const GET: RequestHandler = async () => {
	if (!dev) {
		return json({ profiles: [] });
	}

	const manifest = await readManifest();
	return json(manifest);
};

export const POST: RequestHandler = async ({ request }) => {
	if (!dev) {
		return json({ message: 'Saving cookies is only available in development.' }, { status: 403 });
	}

	const body = (await request.json()) as { name?: string; url?: string; netscape?: string };
	const profileName = body.name?.trim();
	const netscape = body.netscape?.trim();
	let profileUrl: string;

	if (!profileName) {
		return json({ message: 'A profile name is required.' }, { status: 400 });
	}

	if (!body.url?.trim()) {
		return json({ message: 'A URL is required.' }, { status: 400 });
	}

	try {
		profileUrl = normalizeProfileUrl(body.url);
	} catch {
		return json({ message: 'Enter a valid URL.' }, { status: 400 });
	}

	if (!netscape) {
		return json({ message: 'A Netscape cookie file is required.' }, { status: 400 });
	}

	const parsed = parseNetscapeCookieFile(netscape);
	if (parsed.length === 0) {
		return json({ message: 'No valid Netscape cookie lines were found.' }, { status: 400 });
	}

	const slug = sanitizeProfileName(profileName);
	const file = `${slug}.json`;
	const storageState = toPlaywrightStorageState(parsed);
	const storageStatePath = path.join(authDir(), file);

	await mkdir(authDir(), { recursive: true });
	await writeFile(storageStatePath, `${JSON.stringify(storageState, null, 2)}\n`, 'utf-8');

	const manifest = await readManifest();
	const profile: CookieProfile = {
		name: profileName,
		file,
		url: profileUrl,
		savedAt: Date.now(),
		count: parsed.length
	};

	manifest.profiles = [profile, ...manifest.profiles.filter((entry) => sanitizeProfileName(entry.name) !== slug)];
	await writeManifest(manifest);

	return json({
		profile,
		path: getStorageStatePath(profileName)
	});
};

export const PATCH: RequestHandler = async ({ request }) => {
	if (!dev) {
		return json({ message: 'Updating profiles is only available in development.' }, { status: 403 });
	}

	const body = (await request.json()) as { name?: string; url?: string };
	const profileName = body.name?.trim();
	let profileUrl: string;

	if (!profileName) {
		return json({ message: 'A profile name is required.' }, { status: 400 });
	}

	if (!body.url?.trim()) {
		return json({ message: 'A URL is required.' }, { status: 400 });
	}

	try {
		profileUrl = normalizeProfileUrl(body.url);
	} catch {
		return json({ message: 'Enter a valid URL.' }, { status: 400 });
	}

	const slug = sanitizeProfileName(profileName);
	const manifest = await readManifest();
	const index = manifest.profiles.findIndex((entry) => sanitizeProfileName(entry.name) === slug);

	if (index === -1) {
		return json({ message: 'Profile not found.' }, { status: 404 });
	}

	const profile: CookieProfile = { ...manifest.profiles[index], url: profileUrl };
	manifest.profiles[index] = profile;
	await writeManifest(manifest);

	return json({ profile });
};

export const DELETE: RequestHandler = async ({ url }) => {
	if (!dev) {
		return json({ message: 'Deleting cookies is only available in development.' }, { status: 403 });
	}

	const profileName = url.searchParams.get('name')?.trim();
	if (!profileName) {
		return json({ message: 'A profile name is required.' }, { status: 400 });
	}

	const slug = sanitizeProfileName(profileName);
	const manifest = await readManifest();
	const profile = manifest.profiles.find((entry) => sanitizeProfileName(entry.name) === slug);

	if (!profile) {
		return json({ message: 'Profile not found.' }, { status: 404 });
	}

	await unlink(path.join(authDir(), profile.file)).catch(() => undefined);
	manifest.profiles = manifest.profiles.filter((entry) => sanitizeProfileName(entry.name) !== slug);
	await writeManifest(manifest);

	return json({ name: profile.name });
};
