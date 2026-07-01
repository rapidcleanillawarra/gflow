import { defineConfig } from '@playwright/test';
import { getProfileOrigin, loadProfileConfig } from './e2e/lib/profile-config.ts';

const profile = loadProfileConfig();
const flowOnly = process.env.PW_FLOW_ONLY === '1';

export default defineConfig({
	timeout: 60_000,
	workers: 1,
	testMatch: '**/*.e2e.{ts,js}',
	...(!flowOnly && {
		webServer: {
			command: 'npm run build && npm run preview',
			url: 'http://localhost:4173',
			timeout: 120_000,
			reuseExistingServer: !process.env.CI
		}
	}),
	projects: [
		{
			name: 'flow',
			testMatch: '**/e2e/flow.e2e.ts',
			use: {
				...(profile.storageStatePath ? { storageState: profile.storageStatePath } : {}),
				...(profile.url ? { baseURL: getProfileOrigin(profile.url) } : {})
			}
		},
		{
			name: 'app',
			testMatch: '**/demo/**/*.e2e.{ts,js}',
			use: {
				baseURL: 'http://localhost:4173'
			}
		}
	]
});
