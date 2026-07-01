import { spawnSync } from 'node:child_process';

process.env.PW_PAUSE = '1';

console.log('Browser will pause twice: before loading Flow, and after it loads.');
console.log('Use the Playwright Inspector to Resume, or close it when you are done.\n');

const result = spawnSync('npx', ['playwright', 'test', '--project=flow', '--headed'], {
	stdio: 'inherit',
	shell: true,
	env: process.env
});

process.exit(result.status ?? 1);
