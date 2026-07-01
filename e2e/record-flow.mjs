import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

function sanitizeProfileName(name) {
	return (
		name
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9-_]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'default'
	);
}

const authDir = 'e2e/.auth';
const requested = sanitizeProfileName(process.env.PLAYWRIGHT_COOKIE_PROFILE ?? 'default');
const manifestPath = path.join(authDir, 'manifest.json');

if (!existsSync(manifestPath)) {
	console.error('No cookie profiles found. Save one at /cookies while npm run dev is running.');
	process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
let entry = manifest.profiles?.find((item) => sanitizeProfileName(item.name) === requested);

if (!entry && manifest.profiles?.length === 1) {
	entry = manifest.profiles[0];
}

if (!entry?.url) {
	console.error(`No profile URL found for "${requested}". Add or update one at /cookies.`);
	process.exit(1);
}

const slug = sanitizeProfileName(entry.name);
const storageStatePath = path.join(authDir, `${slug}.json`);

if (!existsSync(storageStatePath)) {
	console.error(`Cookie file missing: ${storageStatePath}. Re-save the profile at /cookies.`);
	process.exit(1);
}

console.log(`Recording on Flow as profile "${entry.name}"`);
console.log(`URL: ${entry.url}`);
console.log('Click actions in the browser — Playwright will write code for you. Close the browser when done.\n');

const result = spawnSync(
	'npx',
	['playwright', 'codegen', entry.url, `--load-storage=${storageStatePath}`],
	{ stdio: 'inherit', shell: true }
);

process.exit(result.status ?? 1);
