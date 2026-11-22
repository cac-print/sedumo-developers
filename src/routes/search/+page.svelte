<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';

	type Result = { url: string; title: string; excerpt: string };
	type Pagefind = {
		search: (q: string) => Promise<{
			results: { data: () => Promise<{ url: string; meta: { title?: string }; excerpt: string }> }[];
		} | null>;
	};

	let query = $state('');
	let results = $state<Result[]>([]);
	// The query whose results are shown, once its search has finished.
	let searched = $state('');
	let ready = $state<boolean | null>(null);
	let failed = $state(false);
	let pagefind: Pagefind | null = null;

	onMount(async () => {
		query = page.url.searchParams.get('q') ?? '';
		try {
			// The index is made when the site is built (`npm run build`), so the dev server has none.
			const path = '/pagefind/pagefind.js';
			pagefind = (await import(/* @vite-ignore */ path)) as Pagefind;
			ready = true;
			if (query.trim()) await run();
		} catch {
			ready = false;
		}
	});

	let last = 0;
	async function run() {
		if (!pagefind) return;
		const asked = ++last;
		const q = query.trim();
		try {
			const found = q ? await pagefind.search(q) : null;
			const data = found ? await Promise.all(found.results.slice(0, 20).map((r) => r.data())) : [];
			if (asked !== last) return;
			results = data.map((d) => ({ url: d.url.replace(/\.html$/, ''), title: d.meta.title ?? d.url, excerpt: d.excerpt }));
			searched = q;
			failed = false;
		} catch {
			if (asked === last) failed = true;
		}
		replaceState(q ? `?q=${encodeURIComponent(q)}` : page.url.pathname, page.state);
	}
</script>

<svelte:head>
	<title>Search · Sedumo for developers</title>
</svelte:head>

<main>
	<h1>Search</h1>
	<!-- svelte-ignore a11y_autofocus -->
	<input type="search" bind:value={query} oninput={run} placeholder="Search the guides" aria-label="Search" autofocus />

	{#if ready === false}
		<p class="muted">Search works once the site is built (<code>npm run build</code>).</p>
	{:else if failed}
		<p class="muted">Search didn’t work. Try again.</p>
	{:else if searched && searched === query.trim() && results.length === 0}
		<p class="muted">Nothing found for “{searched}”.</p>
	{/if}

	<ol>
		{#each results as result (result.url)}
			<li>
				<a href={result.url}>{result.title}</a>
				<!-- Pagefind's excerpt: the page's own text, escaped, with the words found in <mark>. -->
				<p>{@html result.excerpt}</p>
			</li>
		{/each}
	</ol>
</main>

<style>
	main {
		max-width: 48rem;
		margin: 0 auto;
		padding: 2.5rem 1rem 0;
	}
	input {
		width: 100%;
		font: inherit;
		font-size: 1.1rem;
		padding: 0.6rem 0.8rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper);
		color: var(--ink);
	}
	ol {
		list-style: none;
		padding: 0;
	}
	li {
		padding: 0.9rem 0;
		border-bottom: 1px solid var(--line);
	}
	li a {
		font-weight: 600;
	}
	li p {
		margin: 0.25rem 0 0;
		color: var(--muted);
	}
	li :global(mark) {
		background: var(--soft);
		color: var(--ink);
	}
	.muted {
		color: var(--muted);
	}
</style>
