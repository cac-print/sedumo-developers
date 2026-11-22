<script lang="ts">
	import { onMount } from 'svelte';
	import ChooseLabel from '#lib/components/ChooseLabel.svelte';
	import HowItWorks from '#lib/components/HowItWorks.svelte';
	import PrintBox from '#lib/components/PrintBox.svelte';
	import ValueFields from '#lib/components/ValueFields.svelte';
	import { cleanRequest, LIMITS, type DocumentRef, type PrintRequest } from '#lib/print-request.ts';
	import { labelCount, manyData, seriesRows, type Counter } from '#lib/records.ts';
	import { loadWho, onBehalfOf, saveWho, type Who } from '#lib/who.ts';

	let { data } = $props();

	let naming = $state<'id' | 'path' | 'sha256'>('path');
	let values = $state<Record<string, string>>({});
	$effect(() => {
		for (const v of data.template?.variables ?? []) if (values[v.name] === undefined) values[v.name] = v.example ?? '';
	});
	let count = $state(6);
	let who = $state<Who>({ id: '', name: '' });
	onMount(() => (who = loadWho()));
	$effect(() => saveWho(who));
	let answer = $state(null);
	let lastStatus = $state<unknown>(null);

	const label = $derived(data.labels.find((l) => l.id === data.labelId) ?? null);
	const variables = $derived(data.template?.variables ?? []);
	const names = $derived(variables.map((v) => v.name));

	// One counter to start: the pallet number, 4 digits, a new number every label. A label without `serial` counts its
	// last field instead.
	let counters = $state<Counter[]>([]);
	let countersFor = $state<string | null>(null);
	$effect(() => {
		if (data.labelId && countersFor !== data.labelId) {
			const name = names.includes('serial') ? 'serial' : names[names.length - 1];
			counters = name ? [{ name, from: 1, step: 1, every: 1, width: 4 }] : [];
			countersFor = data.labelId;
		}
	});
	const addCounter = () =>
		(counters = [...counters, { name: names.find((n) => !counters.some((c) => c.name === n)) ?? names[0], from: 1, step: 1, every: 2, width: 0 }]);
	const removeCounter = (i: number) => (counters = counters.filter((_, j) => j !== i));

	const labels = $derived(Math.min(Math.max(Math.round(Number(count) || 1), 1), LIMITS.labels));
	const counted = $derived(new Set(counters.map((c) => c.name)));
	const rows = $derived(
		seriesRows(
			Object.fromEntries(variables.filter((v) => !counted.has(v.name)).map((v) => [v.name, values[v.name] ?? ''])),
			labels,
			counters.filter((c) => names.includes(c.name)).map((c) => ({
				...c,
				from: Number(c.from) || 0,
				step: Number(c.step) || 0,
				every: Math.max(1, Number(c.every) || 1),
				width: Math.min(Math.max(Number(c.width) || 0, 0), 20)
			})),
			LIMITS.copies
		)
	);
	const documentRef = $derived<DocumentRef | null>(
		label ? (naming === 'id' ? { id: label.id } : naming === 'sha256' ? { sha256: label.sha256 } : { path: label.path }) : null
	);
	const request = $derived<PrintRequest | null>(
		documentRef && data.printerId
			? cleanRequest({ document: documentRef, printerId: data.printerId, data: manyData(rows, true), onBehalfOf: onBehalfOf(who) })
			: null
	);
</script>

<svelte:head>
	<title>A series with counters · Examples · Sedumo for developers</title>
	<meta name="description" content="Numbered labels: your app counts, and sends only what changes." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">A series with counters</h1>
		<p class="lead">Numbered labels: pallet 0001 to 0006, a box number every 2 labels, and so on.</p>
		{#if data.problem}<p class="problem">{data.problem}</p>{/if}
		{#if data.noToken}
			<p class="problem">This copy of the site has no Sedumo token. Set <code>SEDUMO_TOKEN</code> on its server (see the README).</p>
		{/if}

		<ChooseLabel {data} bind:naming onchoose={() => (answer = null)} />
		<ValueFields variables={variables.filter((v) => !counted.has(v.name))} bind:values />

		<label>Labels <input type="number" min="1" max={LIMITS.labels} bind:value={count} /></label>

		<fieldset class="counters">
			<legend>Counters</legend>
			{#each counters as counter, i (i)}
				<div class="counter">
					<label>Field
						<select bind:value={counter.name}>
							{#each names.filter((n) => n === counter.name || !counters.some((c) => c.name === n)) as n (n)}<option value={n}>{n}</option>{/each}
						</select>
					</label>
					<label>From <input type="number" bind:value={counter.from} /></label>
					<label>Step <input type="number" bind:value={counter.step} /></label>
					<label>Every <input type="number" min="1" bind:value={counter.every} /></label>
					<label>Digits <input type="number" min="0" max="20" bind:value={counter.width} /></label>
					<button type="button" class="remove" onclick={() => removeCounter(i)} aria-label="Remove this counter">×</button>
				</div>
			{/each}
			{#if counters.length < names.length}
				<button type="button" class="add" onclick={addCounter}>Add a counter</button>
			{/if}
		</fieldset>
		<p class="count">{labelCount(rows)} labels as {rows.length} records: labels in a row that are the same go as one record with copies.</p>

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
					Use it for numbered labels: pallets, cartons, serial numbers. Sedumo prints the values it’s sent and doesn’t
					count, so your app counts: it knows where the last series ended, and it can give the next one a new start.
				</p>
				<p>
					The request sends what all labels share once (<code>common</code>), then each label only its new number
					(<code>changes</code>). Labels in a row that come out the same, such as a box number that changes every second
					label, go as one record with <code>copies</code>.
				</p>
			{/snippet}
			{#snippet notes()}
				<p>
					Keep your own counter where your app keeps its data, and send the next run with an
					<a href="/guides/api#4-print">Idempotency-Key</a>, so a retry after a timeout never prints the same numbers twice.
				</p>
			{/snippet}
		</HowItWorks>
	</section>
</div>

<style>
	.counters {
		border: 0;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.6rem;
	}
	.counters legend {
		font-weight: 600;
		padding: 0;
		margin-bottom: 0.25rem;
		font-size: 0.95rem;
	}
	.counter {
		display: grid;
		grid-template-columns: minmax(6rem, 2fr) repeat(4, minmax(3.5rem, 1fr)) auto;
		gap: 0.5rem;
		align-items: end;
	}
	.counter label {
		font-size: 0.85rem;
	}
	.remove,
	.add {
		font: inherit;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--paper);
		color: var(--ink);
		cursor: pointer;
	}
	.remove {
		padding: 0.45rem 0.7rem;
	}
	.add {
		justify-self: start;
		padding: 0.35rem 0.8rem;
		font-size: 0.9rem;
	}
	@media (max-width: 30rem) {
		.counter {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
