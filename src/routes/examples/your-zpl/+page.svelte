<script lang="ts">
	import { onMount } from 'svelte';
	import ChoosePrinter from '#lib/components/ChoosePrinter.svelte';
	import HowItWorks from '#lib/components/HowItWorks.svelte';
	import PrintBox from '#lib/components/PrintBox.svelte';
	import { hooksOf } from '#lib/hooks.ts';
	import { cleanRequest, LIMITS, type PrintRequest } from '#lib/print-request.ts';
	import { loadWho, onBehalfOf, saveWho, type Who } from '#lib/who.ts';

	let { data } = $props();

	// A product label as a ZPL program, for a 203 dpi printer; the worker fills each {{name}} with its value.
	let zpl = $state(
		[
			'^XA',
			'^CI28',
			'^FO40,30^A0N,48,48^FD{{product}}^FS',
			'^FO40,95^A0N,30,30^FDLot {{lot}}^FS',
			'^FO40,140^BY2^BCN,90,Y,N,N^FD{{lot}}^FS',
			'^XZ'
		].join('\n')
	);
	let values = $state<Record<string, string>>({ product: 'Milk 1 l', lot: 'L2026-10' });
	let copies = $state(1);
	let who = $state<Who>({ id: '', name: '' });
	onMount(() => (who = loadWho()));
	$effect(() => saveWho(who));
	let answer = $state(null);
	let lastStatus = $state<unknown>(null);

	const hooks = $derived(hooksOf(zpl));
	const request = $derived<PrintRequest | null>(
		data.printerId
			? cleanRequest({
					document: { content: zpl, kind: 'stream' },
					printerId: data.printerId,
					data: {
						values: Object.fromEntries(hooks.map((h) => [h, values[h] ?? ''])),
						copies: Math.min(Math.max(Math.round(Number(copies) || 1), 1), LIMITS.copies)
					},
					onBehalfOf: onBehalfOf(who)
				})
			: null
	);
</script>

<svelte:head>
	<title>Your own ZPL · Examples · Sedumo for developers</title>
	<meta name="description" content="Print ZPL your system makes, with values Sedumo's worker fills in." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">Your own ZPL</h1>
		<p class="lead">Printer commands your system already makes, sent with the request.</p>
		{#if data.problem}<p class="problem">{data.problem}</p>{/if}
		{#if data.noToken}
			<p class="problem">This copy of the site has no Sedumo token. Set <code>SEDUMO_TOKEN</code> on its server (see the README).</p>
		{/if}

		<ChoosePrinter {data} onchoose={() => (answer = null)} />

		<label>
			<span>The ZPL <small><code>{'{{name}}'}</code> is a value the worker fills in</small></span>
			<textarea rows="8" bind:value={zpl} spellcheck="false"></textarea>
		</label>
		{#each hooks as hook (hook)}
			<label>{hook} <input bind:value={values[hook]} /></label>
		{/each}

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
			guides={[{ href: '/guides/api#7-print-a-file-you-made-yourself', text: 'API guide: 7. Print a file you made yourself' }]}
		>
			{#snippet intro()}
				<p>
					Use it when your system already makes its labels as printer commands and you want Sedumo for the rest: getting
					them to the right printer, the queue, printing offline, and the record of what printed.
				</p>
				<p>
					The ZPL goes with the request as <code>content</code>, <code>kind: "stream"</code>. Write <code>{'{{name}}'}</code>
					where a value goes and send the values as with a label: the worker fills them in, once per record. Without any, it
					prints the file as it is.
				</p>
			{/snippet}
			{#snippet notes()}
				<p>
					A ZPL file prints only on a ZPL printer; another printer refuses it. Values go in as they are, so a value with
					<code>^</code> or <code>~</code> changes the printer’s commands. Sedumo doesn’t preview a file it didn’t design.
				</p>
			{/snippet}
		</HowItWorks>
	</section>
</div>
