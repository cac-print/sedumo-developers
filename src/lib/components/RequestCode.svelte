<script lang="ts">
	import { onMount } from 'svelte';
	import Code from './Code.svelte';
	import { codeFor, onlyIn, LANGUAGES, PDF_FILE, type Language } from '#lib/code.ts';
	import type { PrintRequest } from '#lib/print-request.ts';

	// The request in the language the reader picks; the choice is kept in this browser for every example.
	let {
		request,
		apiUrl,
		headers = {},
		path = '/print'
	}: { request: PrintRequest; apiUrl: string; headers?: Record<string, string>; path?: string } = $props();

	const KEY = 'sedumo-examples-language';
	let language = $state<Language>('curl');
	onMount(() => {
		try {
			const kept = localStorage.getItem(KEY);
			if (LANGUAGES.some((l) => l.id === kept)) language = kept as Language;
		} catch {
			// no storage: curl each time
		}
	});
	function choose(id: Language) {
		language = id;
		try {
			localStorage.setItem(KEY, id);
		} catch {
			// no storage: the choice lasts this page
		}
	}

	const name = $derived(LANGUAGES.find((l) => l.id === language)?.name ?? language);
	const pdf = $derived('content' in request.document && request.document.encoding === 'base64');
	const app = $derived(onlyIn(language));
</script>

<div class="languages" role="tablist" aria-label="Language">
	{#each LANGUAGES as l (l.id)}
		<button type="button" role="tab" aria-selected={language === l.id} onclick={() => choose(l.id)}>{l.name}</button>
	{/each}
</div>
<div role="tabpanel" aria-label={name}>
	<Code code={codeFor(language, request, { apiUrl, headers, path })} label="the request in {name}" />
	{#if language !== 'curl'}
		<p class="small">
			{#if app}
				For {app}. Sent like the others, but not run in our checks: it runs only inside {app}.
			{:else}
				Only the language’s own library; our checks run it and compare what it sends with the page’s request.
			{/if}
			{#if pdf && !app}It reads the PDF from <code>{PDF_FILE}</code> next to it.{/if}
			{#if pdf && language === 'vba'}It reads the PDF from <code>{PDF_FILE}</code> in the workbook’s folder.{/if}
		</p>
	{/if}
</div>

<style>
	.languages {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
	}
	button {
		font: inherit;
		font-size: 0.85rem;
		padding: 0.15rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--paper);
		color: var(--ink);
		cursor: pointer;
	}
	button[aria-selected='true'] {
		background: var(--ground);
		border-color: var(--ground);
		color: var(--on-ground);
	}
	.small {
		color: var(--muted);
		font-size: 0.9rem;
		margin: 0.5rem 0 0;
	}
</style>
