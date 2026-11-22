<script lang="ts">
	import { onMount } from 'svelte';

	type Result = { url: string; title: string; excerpt: string };
	type Pagefind = {
		search: (q: string) => Promise<{
			results: { data: () => Promise<{ url: string; meta: { title?: string }; excerpt: string }> }[];
		} | null>;
	};

	let query = $state('');
	let results = $state<Result[]>([]);
	let ready = $state<boolean | null>(null);
	let pagefind: Pagefind | null = null;

	onMount(async () => {
		query = new URL(location.href).searchParams.get('q') ?? '';
		try {
			// The index is made when the site is built (`npm run build`), so the dev server has none.
			const path = '/pagefind/pagefind.js';
			pagefind = (await import(/* @vite-ignore */ path)) as Pagefind;
			ready = true;
			if (query) await run();
		} catch {
			ready = false;
		}
	});

	let last = 0;
	async function run() {
		if (!pagefind) return;
		const asked = ++last;
		const found = query.trim() ? await pagefind.search(query.trim()) : null;
		const data = found ? await Promise.all(found.results.slice(0, 20).map((r) => r.data())) : [];
		if (asked !== last) return;
		results = data.map((d) => ({ url: d.url.replace(/\.html$/, ''), title: d.meta.title ?? d.url, excerpt: d.excerpt }));
		history.replaceState(history.state, '', query ? `?q=${encodeURIComponent(query)}` : location.pathname);
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
	{:else if query.trim() && ready && results.length === 0}
		<p class="muted">Nothing found for “{query}”.</p>
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
