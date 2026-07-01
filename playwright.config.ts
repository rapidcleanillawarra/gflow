import { defineConfig } from '@playwright/test';
import { getProfileOrigin, loadProfileConfig } from './e2e/lib/profile-config.ts';

const profile = loadProfileConfig();

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	testMatch: '**/*.e2e.{ts,js}',
	use: {
		...(profile.storageStatePath ? { storageState: profile.storageStatePath } : {}),
		...(profile.url ? { baseURL: getProfileOrigin(profile.url) } : {})
	}
});
