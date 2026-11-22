<script lang="ts">
	import { onMount } from 'svelte';
	import ChooseLabel from '#lib/components/ChooseLabel.svelte';
	import HowItWorks from '#lib/components/HowItWorks.svelte';
	import PrintBox from '#lib/components/PrintBox.svelte';
	import { cleanRequest, LIMITS, type DocumentRef, type PrintRequest } from '#lib/print-request.ts';
	import { exampleTable, labelCount, manyData, parseTable } from '#lib/records.ts';
	import { loadWho, onBehalfOf, saveWho, type Who } from '#lib/who.ts';

	let { data } = $props();

	let naming = $state<'id' | 'path' | 'sha256'>('path');
	let changesOnly = $state(false);
	let who = $state<Who>({ id: '', name: '' });
	onMount(() => (who = loadWho()));
	$effect(() => saveWho(who));
	let answer = $state(null);
	let lastStatus = $state<unknown>(null);

	const label = $derived(data.labels.find((l) => l.id === data.labelId) ?? null);
	const variables = $derived(data.template?.variables ?? []);
	const names = $derived(variables.map((v) => v.name));
	const examples = $derived(Object.fromEntries(variables.map((v) => [v.name, v.example ?? ''])));

	// The table starts as three example records of the label, and again when another label is chosen.
	let table = $state('');
	let tableFor = $state<string | null>(null);
	$effect(() => {
		if (data.labelId && tableFor !== data.labelId) {
			table = exampleTable(names, examples);
			tableFor = data.labelId;
		}
	});

	const parsed = $derived(parseTable(table, names));
	const documentRef = $derived<DocumentRef | null>(
		label ? (naming === 'id' ? { id: label.id } : naming === 'sha256' ? { sha256: label.sha256 } : { path: label.path }) : null
	);
	const request = $derived<PrintRequest | null>(
		documentRef && data.printerId && 'rows' in parsed
			? cleanRequest({
					document: documentRef,
					printerId: data.printerId,
					data: manyData(parsed.rows, changesOnly),
					onBehalfOf: onBehalfOf(who)
				})
			: null
	);
</script>

<svelte:head>
	<title>Many labels in one print · Examples · Sedumo for developers</title>
	<meta name="description" content="Print many labels in one request: every record in full, or only what changes." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">Many labels in one print</h1>
		<p class="lead">A batch of different labels in one request, printed together as one print.</p>
		{#if data.problem}<p class="problem">{data.problem}</p>{/if}
		{#if data.noToken}
			<p class="problem">This copy of the site has no Sedumo token. Set <code>SEDUMO_TOKEN</code> on its server (see the README).</p>
		{/if}

		<ChooseLabel {data} bind:naming onchoose={() => (answer = null)} />

		<label>
			<span>The records <small>a row per label; paste from a spreadsheet, or type with commas</small></span>
			<textarea rows="6" bind:value={table} spellcheck="false"></textarea>
		</label>
		{#if 'error' in parsed}
			<p class="problem">{parsed.error}</p>
		{:else}
			<p class="count">
				{parsed.rows.length} records, {labelCount(parsed.rows)} labels{labelCount(parsed.rows) > LIMITS.labels
					? ` (the demo prints at most ${LIMITS.labels})`
					: ''}
			</p>
		{/if}

		<fieldset class="mode">
			<legend>Send them as</legend>
			<label><input type="radio" bind:group={changesOnly} value={false} /> every record in full (<code>records</code>)</label>
			<label><input type="radio" bind:group={changesOnly} value={true} /> what they share, then only what changes (<code>common</code>, <code>changes</code>)</label>
		</fieldset>

		<label>Your name <input bind:value={who.name} placeholder="Shown in Sedumo’s print history" /></label>

		<PrintBox {request} size={data.template?.size ?? null} bind:answer bind:lastStatus />
	</section>

	<section class="how" aria-label="How it works">
		<HowItWorks
			{request}
			{answer}
			{lastStatus}
			apiUrl={data.apiUrl}
			guides={[{ href: '/guides/api#4-print', text: 'API guide: 4. Print (the data)' }]}
		>
			{#snippet intro()}
				<p>
					Use it when your system has a batch: an order’s lines, a pallet’s cartons, a shift’s products. One request
					carries every label, each record with its own copies, and the printer gets them as one print, in order.
				</p>
				<p>
					For long runs where most values stay the same, send only what changes: what all records share goes once in
					<code>common</code>, then each record only what differs from the one before. Both print the same labels.
				</p>
			{/snippet}
			{#snippet notes()}
				<p>
					Sedumo checks every record before anything prints: a missing required value is refused with the record’s number.
					The answer’s <code>labels</code> is how many labels the data makes. The preview shows the first.
				</p>
			{/snippet}
		</HowItWorks>
	</section>
</div>

<style>
	.mode {
		border: 0;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.3rem;
		font-size: 0.95rem;
	}
	.mode legend {
		font-weight: 600;
		padding: 0;
		margin-bottom: 0.25rem;
	}
	.mode label {
		display: flex;
		gap: 0.4rem;
		align-items: baseline;
		font-weight: 400;
	}
	.mode input {
		width: auto;
	}
</style>
