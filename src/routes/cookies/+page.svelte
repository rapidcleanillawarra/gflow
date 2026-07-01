<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { parseNetscapeCookieFile } from '$lib/netscape-cookies';
	import { getStorageStatePath, sanitizeProfileName, type CookieProfile } from '$lib/playwright-cookies';

	let profileName = $state('');
	let profileUrl = $state('');
	let netscapeInput = $state('');
	let profiles = $state<CookieProfile[]>([]);
	let message = $state('');
	let saving = $state(false);

	function showMessage(text: string) {
		message = text;
	}

	async function loadProfiles() {
		try {
			const response = await fetch(resolve('/cookies/api'));
			if (!response.ok) return;

			const data = (await response.json()) as { profiles?: CookieProfile[] };
			profiles = data.profiles ?? [];
		} catch {
			profiles = [];
		}
	}

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();

		const name = profileName.trim();
		const url = profileUrl.trim();
		const netscape = netscapeInput.trim();

		if (!name) {
			showMessage('Profile name is required.');
			return;
		}

		if (!url) {
			showMessage('URL is required.');
			return;
		}

		if (!netscape) {
			showMessage('Paste a Netscape cookie file.');
			return;
		}

		if (parseNetscapeCookieFile(netscape).length === 0) {
			showMessage('No valid Netscape cookie lines found.');
			return;
		}

		saving = true;

		try {
			const response = await fetch(resolve('/cookies/api'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, url, netscape })
			});

			const data = (await response.json()) as {
				message?: string;
				path?: string;
				profile?: CookieProfile;
			};

			if (!response.ok) {
				showMessage(data.message ?? 'Failed to save cookies.');
				return;
			}

			await loadProfiles();
			showMessage(
				`Saved "${data.profile?.name}" (${data.profile?.count} cookies) to ${data.path}. Use PLAYWRIGHT_COOKIE_PROFILE=${sanitizeProfileName(name)} for tests.`
			);
		} catch {
			showMessage('Could not reach the dev server. Run npm run dev and try again.');
		} finally {
			saving = false;
		}
	}

	async function handleDelete(name: string) {
		try {
			const response = await fetch(`${resolve('/cookies/api')}?name=${encodeURIComponent(name)}`, {
				method: 'DELETE'
			});

			const data = (await response.json()) as { message?: string };

			if (!response.ok) {
				showMessage(data.message ?? 'Failed to delete profile.');
				return;
			}

			await loadProfiles();
			showMessage(`Deleted "${name}".`);
		} catch {
			showMessage('Could not reach the dev server.');
		}
	}

	$effect(() => {
		if (browser) loadProfiles();
	});
</script>

<svelte:head>
	<title>Cookie setup</title>
</svelte:head>

<main class="page">
	<h1>Cookie setup</h1>
	<p class="lead">Save named Netscape cookie files for Playwright tests.</p>

	<section class="card highlight">
		<h2>Playwright</h2>
		<ol class="steps">
			<li>Give the cookie set a name, target URL, and paste the Netscape file.</li>
			<li>Click <strong>Save</strong> while <code>npm run dev</code> is running.</li>
			<li>
				Run tests with
				<code>PLAYWRIGHT_COOKIE_PROFILE=your-name npm run test:e2e</code>
			</li>
		</ol>
	</section>

	<section class="card">
		<h2>Save cookies</h2>
		<form class="form" onsubmit={handleSave}>
			<label>
				Name
				<input bind:value={profileName} placeholder="labs-google" required />
			</label>
			<label>
				URL
				<input
					bind:value={profileUrl}
					type="url"
					placeholder="https://labs.google/fx/tools/flow"
					required
				/>
			</label>
			<label class="textarea-label">
				Netscape cookie file
				<textarea
					bind:value={netscapeInput}
					rows="12"
					placeholder="# Netscape HTTP Cookie File&#10;.example.com	TRUE	/	FALSE	1234567890	session	abc123"
					required
				></textarea>
			</label>
			<button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
		</form>
	</section>

	<section class="card">
		<h2>Saved profiles</h2>
		{#if profiles.length > 0}
			<ul class="profiles">
				{#each profiles as profile (profile.file)}
					<li>
						<div>
							<strong>{profile.name}</strong>
							<p class="meta">
								{#if profile.url}
									<a href={profile.url} target="_blank" rel="noreferrer">{profile.url}</a>
									·
								{/if}
								{profile.count} cookies · {getStorageStatePath(profile.name)} · saved
								{new Date(profile.savedAt).toLocaleString()}
							</p>
						</div>
						<button type="button" class="danger" onclick={() => handleDelete(profile.name)}>
							Delete
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">No saved profiles yet.</p>
		{/if}
	</section>

	{#if message}
		<p class="message" role="status">{message}</p>
	{/if}
</main>

<style>
	.page {
		max-width: 48rem;
		margin: 0 auto;
		padding: 2rem 1rem 3rem;
		font-family: system-ui, sans-serif;
		line-height: 1.5;
	}

	h1,
	h2 {
		margin: 0 0 0.75rem;
	}

	.lead {
		margin: 0 0 1.5rem;
		color: #475569;
	}

	.card {
		padding: 1.25rem;
		margin-bottom: 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		background: #fff;
	}

	.card.highlight {
		border-color: #bfdbfe;
		background: #eff6ff;
	}

	.steps {
		margin: 0;
		padding-left: 1.25rem;
	}

	.form,
	.textarea-label {
		display: grid;
		gap: 0.75rem;
	}

	label {
		display: grid;
		gap: 0.35rem;
		font-size: 0.9rem;
		font-weight: 600;
	}

	input,
	textarea {
		padding: 0.55rem 0.7rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		font: inherit;
		font-weight: 400;
	}

	textarea {
		resize: vertical;
		min-height: 12rem;
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
	}

	button {
		padding: 0.6rem 0.9rem;
		border: 0;
		border-radius: 0.5rem;
		background: #2563eb;
		color: #fff;
		font: inherit;
		cursor: pointer;
	}

	button.danger {
		background: #dc2626;
	}

	button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.profiles {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.profiles li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 0;
		border-top: 1px solid #e2e8f0;
	}

	.profiles li:first-child {
		border-top: 0;
		padding-top: 0;
	}

	.meta,
	.empty {
		margin: 0.25rem 0 0;
		color: #64748b;
		font-size: 0.9rem;
		font-weight: 400;
	}

	.message {
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		background: #eff6ff;
		color: #1d4ed8;
	}
</style>
