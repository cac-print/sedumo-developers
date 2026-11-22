<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ChoosePrinter from '#lib/components/ChoosePrinter.svelte';
	import HowItWorks from '#lib/components/HowItWorks.svelte';
	import PrintBox from '#lib/components/PrintBox.svelte';
	import { cleanRequest, LIMITS, type DocumentRef, type PrintRequest } from '#lib/print-request.ts';
	import { loadWho, onBehalfOf, saveWho, type Who } from '#lib/who.ts';

	let { data } = $props();

	let naming = $state<'id' | 'path' | 'sha256'>('path');
	let copies = $state(1);
	let who = $state<Who>({ id: '', name: '' });
	onMount(() => (who = loadWho()));
	$effect(() => saveWho(who));
	let answer = $state(null);
	let lastStatus = $state<unknown>(null);

	const file = $derived(data.files.find((f) => f.id === data.fileId) ?? null);
	const isPdf = $derived(!!file && /\.pdf$/i.test(file.name));

	// A PDF goes to the office printer, a ZPL file to a ZPL printer, when the file changes.
	function chooseFile(id: string) {
		const chosen = data.files.find((f) => f.id === id);
		const printer = data.printers.find((p) => p.name === (chosen && /\.pdf$/i.test(chosen.name) ? 'PDF office printer' : 'ZPL 203 dpi'));
		const params = new URLSearchParams(location.search);
		params.set('file', id);
		if (printer) params.set('printer', printer.id);
		goto(`?${params}`, { replace: true, reset: false });
		answer = null;
	}

	const documentRef = $derived<DocumentRef | null>(
		file ? (naming === 'id' ? { id: file.id } : naming === 'sha256' ? { sha256: file.sha256 } : { path: file.path }) : null
	);
	const request = $derived<PrintRequest | null>(
		documentRef && data.printerId
			? cleanRequest({
					document: documentRef,
					printerId: data.printerId,
					data: { values: {}, copies: Math.min(Math.max(Math.round(Number(copies) || 1), 1), LIMITS.copies) },
					onBehalfOf: onBehalfOf(who)
				})
			: null
	);
</script>

<svelte:head>
	<title>A file stored in Sedumo · Examples · Sedumo for developers</title>
	<meta name="description" content="Print a ZPL file or a PDF kept in Sedumo, by its path, id or version." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">A file stored in Sedumo</h1>
		<p class="lead">A ZPL file or a PDF someone uploaded to Sedumo, printed as it is.</p>
		{#if data.problem}<p class="problem">{data.problem}</p>{/if}
		{#if data.noToken}
			<p class="problem">This copy of the site has no Sedumo token. Set <code>SEDUMO_TOKEN</code> on its server (see the README).</p>
		{/if}

		<label>
			File
			<select value={data.fileId} onchange={(e) => chooseFile(e.currentTarget.value)}>
				{#each data.files as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
			</select>
		</label>
		<ChoosePrinter {data} onchoose={() => (answer = null)} />

		<fieldset class="naming">
			<legend>Name the file by</legend>
			<label><input type="radio" bind:group={naming} value="path" /> its path</label>
			<label><input type="radio" bind:group={naming} value="id" /> its id</label>
			<label><input type="radio" bind:group={naming} value="sha256" /> this exact version</label>
		</fieldset>

		<div class="row">
			<label>Copies <input type="number" min="1" max={LIMITS.copies} bind:value={copies} /></label>
			<label>Your name <input bind:value={who.name} placeholder="Shown in Sedumo’s print history" /></label>
		</div>

		<PrintBox {request} size={null} preview={false} bind:answer bind:lastStatus />
	</section>

	<section class="how" aria-label="How it works">
		<HowItWorks
			{request}
			{answer}
			{lastStatus}
			apiUrl={data.apiUrl}
			guides={[{ href: '/guides/api#4-print', text: 'API guide: 4. Print (the document)' }]}
		>
			{#snippet intro()}
				<p>
					Use it for files that don’t change, or that someone else looks after: a shipping mark, a data sheet, a set of
					instructions. They’re uploaded once in Sedumo, and your app names them like a label: by path, by id, or by the
					exact version (<code>sha256</code>), which keeps printing that version even after someone uploads a new one.
				</p>
			{/snippet}
			{#snippet notes()}
				<p>
					{isPdf ? 'A PDF prints only on a printer set up for PDFs.' : 'A ZPL file prints only on a ZPL printer.'} A file
					takes no values, so the data is <code>{'{ "values": {} }'}</code> with its copies.
				</p>
			{/snippet}
		</HowItWorks>
	</section>
</div>

<style>
	.naming {
		border: 0;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		font-size: 0.95rem;
	}
	.naming legend {
		font-weight: 600;
		padding: 0;
		margin-bottom: 0.25rem;
	}
	.naming label {
		display: flex;
		gap: 0.35rem;
		align-items: center;
		font-weight: 400;
	}
	.naming input {
		width: auto;
	}
</style>
