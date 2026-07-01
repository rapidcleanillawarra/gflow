export type NetscapeCookie = {
	domain: string;
	includeSubdomains: boolean;
	path: string;
	secure: boolean;
	expires: number;
	name: string;
	value: string;
};

function decodeCookieValue(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

export function parseNetscapeCookieFile(text: string): NetscapeCookie[] {
	const cookies: NetscapeCookie[] = [];

	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		const parts = trimmed.split('\t');
		if (parts.length < 7) continue;

		const [domain, subdomains, path, secure, expires, name, ...valueParts] = parts;

		cookies.push({
			domain,
			includeSubdomains: subdomains.toUpperCase() === 'TRUE',
			path,
			secure: secure.toUpperCase() === 'TRUE',
			expires: Number.parseInt(expires, 10) || 0,
			name,
			value: decodeCookieValue(valueParts.join('\t'))
		});
	}

	return cookies;
}

export function formatNetscapeCookieFile(cookies: NetscapeCookie[]): string {
	const lines = [
		'# Netscape HTTP Cookie File',
		'# https://curl.haxx.se/rfc/cookie_spec.html',
		'# This is a generated file! Do not edit.',
		''
	];

	for (const cookie of cookies) {
		lines.push(
			[
				cookie.domain,
				cookie.includeSubdomains ? 'TRUE' : 'FALSE',
				cookie.path,
				cookie.secure ? 'TRUE' : 'FALSE',
				cookie.expires,
				cookie.name,
				cookie.value
			].join('\t')
		);
	}

	return lines.join('\n');
}
