<script lang="ts">
	import { onMount } from 'svelte';
	import ChooseLabel from '#lib/components/ChooseLabel.svelte';
	import HowItWorks from '#lib/components/HowItWorks.svelte';
	import PrintBox from '#lib/components/PrintBox.svelte';
	import ValueFields from '#lib/components/ValueFields.svelte';
	import { cleanRequest, LIMITS, type DocumentRef, type PrintRequest } from '#lib/print-request.ts';
	import { loadWho, onBehalfOf, saveWho, type Who } from '#lib/who.ts';

	let { data } = $props();

	// The fields start with the label's example values; a field of the same name keeps its value when the label changes.
	let values = $state<Record<string, string>>({});
	$effect(() => {
		for (const v of data.template?.variables ?? []) if (values[v.name] === undefined) values[v.name] = v.example ?? '';
	});
	let copies = $state(1);
	let naming = $state<'id' | 'path' | 'sha256'>('path');
	let darkness = $state<number | undefined>();
	let speed = $state<number | undefined>();
	let who = $state<Who>({ id: '', name: '' });
	onMount(() => (who = loadWho()));
	$effect(() => saveWho(who));

	let answer = $state(null);
	let lastStatus = $state<unknown>(null);

	const label = $derived(data.labels.find((l) => l.id === data.labelId) ?? null);
	const variables = $derived(data.template?.variables ?? []);
	const documentRef = $derived<DocumentRef | null>(
		label ? (naming === 'id' ? { id: label.id } : naming === 'sha256' ? { sha256: label.sha256 } : { path: label.path }) : null
	);
	const request = $derived<PrintRequest | null>(
		documentRef && data.printerId
			? cleanRequest({
					document: documentRef,
					printerId: data.printerId,
					data: {
						values: Object.fromEntries(variables.map((v) => [v.name, values[v.name] ?? ''])),
						copies: Math.min(Math.max(Math.round(Number(copies) || 1), 1), LIMITS.copies)
					},
					onBehalfOf: onBehalfOf(who),
					settings: { darkness, speedMmS: speed }
				})
			: null
	);
</script>

<svelte:head>
	<title>Print a label · Examples · Sedumo for developers</title>
	<meta name="description" content="Print a label designed in Sedumo: a document, a printer and the values." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">Print a label</h1>
		<p class="lead">A label designed in Sedumo, a printer, and the values to put on it: one request.</p>
		{#if data.problem}<p class="problem">{data.problem}</p>{/if}
		{#if data.noToken}
			<p class="problem">This copy of the site has no Sedumo token. Set <code>SEDUMO_TOKEN</code> on its server (see the README).</p>
		{/if}

		<ChooseLabel {data} bind:naming onchoose={() => (answer = null)} />
		<ValueFields {variables} bind:values />

		<div class="row">
			<label>Copies <input type="number" min="1" max={LIMITS.copies} bind:value={copies} /></label>
			<label>Your name <input bind:value={who.name} placeholder="Shown in Sedumo’s print history" /></label>
		</div>
		<details>
			<summary>Print settings</summary>
			<div class="row">
				<label>Darkness (1–30) <input type="number" min="1" max="30" bind:value={darkness} /></label>
				<label>Speed (mm/s) <input type="number" min="20" max="500" bind:value={speed} /></label>
			</div>
		</details>

		<PrintBox {request} size={data.template?.size ?? null} bind:answer bind:lastStatus />
	</section>

	<section class="how" aria-label="How it works">
		<HowItWorks
			{request}
			{answer}
			{lastStatus}
			apiUrl={data.apiUrl}
			guides={[
				{ href: '/guides/api#4-print', text: 'API guide: 4. Print' },
				{ href: '/guides/api#6-follow-a-print', text: '6. Follow a print' }
			]}
		>
			{#snippet intro()}
				<p>
					Use it when your system knows what to print and a person or a process says when: a product, a parcel, a pallet.
					The label is designed in Sedumo; your app sends only its name, the printer and the values. Sedumo picks the
					label’s version for that printer’s language, and the worker next to the printer fills it in and prints it.
				</p>
			{/snippet}
			{#snippet notes()}
				<p>
					From your server, with your token. A value left out prints empty; a required one left out, or a choice not on its
					list, is refused with the reason.
				</p>
			{/snippet}
		</HowItWorks>
	</section>
</div>
