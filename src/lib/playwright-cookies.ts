import type { NetscapeCookie } from '$lib/netscape-cookies';

export const PLAYWRIGHT_AUTH_DIR = 'e2e/.auth';
export const PLAYWRIGHT_MANIFEST_PATH = `${PLAYWRIGHT_AUTH_DIR}/manifest.json`;

export type PlaywrightCookie = {
	name: string;
	value: string;
	domain: string;
	path: string;
	expires: number;
	httpOnly: boolean;
	secure: boolean;
	sameSite: 'Strict' | 'Lax' | 'None';
};

export type PlaywrightStorageState = {
	cookies: PlaywrightCookie[];
	origins: [];
};

export type CookieProfile = {
	name: string;
	file: string;
	url?: string;
	savedAt: number;
	count: number;
};

export type CookieProfileManifest = {
	profiles: CookieProfile[];
};

export function sanitizeProfileName(name: string): string {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-_]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug || 'default';
}

export function getStorageStatePath(profileName: string): string {
	return `${PLAYWRIGHT_AUTH_DIR}/${sanitizeProfileName(profileName)}.json`;
}

export function normalizeProfileUrl(url: string): string {
	const trimmed = url.trim();
	if (!trimmed) {
		throw new Error('URL is required.');
	}

	return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).href;
}

function inferHttpOnly(name: string): boolean {
	return name.startsWith('__Host-') || name.startsWith('__Secure-');
}

function inferSecure(cookie: NetscapeCookie): boolean {
	return cookie.secure || cookie.name.startsWith('__Secure-') || cookie.name.startsWith('__Host-');
}

function normalizeDomain(cookie: NetscapeCookie): string {
	if (cookie.includeSubdomains && !cookie.domain.startsWith('.')) {
		return `.${cookie.domain}`;
	}

	return cookie.domain;
}

export function netscapeToPlaywrightCookies(cookies: NetscapeCookie[]): PlaywrightCookie[] {
	return cookies.map((cookie) => ({
		name: cookie.name,
		value: cookie.value,
		domain: normalizeDomain(cookie),
		path: cookie.path || '/',
		expires: cookie.expires > 0 ? cookie.expires : -1,
		httpOnly: inferHttpOnly(cookie.name),
		secure: inferSecure(cookie),
		sameSite: 'Lax'
	}));
}

export function toPlaywrightStorageState(cookies: NetscapeCookie[]): PlaywrightStorageState {
	return {
		cookies: netscapeToPlaywrightCookies(cookies),
		origins: []
	};
}
