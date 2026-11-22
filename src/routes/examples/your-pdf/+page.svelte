<script lang="ts">
	import { onMount } from 'svelte';
	import ChoosePrinter from '#lib/components/ChoosePrinter.svelte';
	import HowItWorks from '#lib/components/HowItWorks.svelte';
	import PrintBox from '#lib/components/PrintBox.svelte';
	import { deliveryNotePdf, toBase64, type DeliveryNote } from '#lib/delivery-note.ts';
	import { cleanRequest, LIMITS, type PrintRequest } from '#lib/print-request.ts';
	import { loadWho, onBehalfOf, saveWho, type Who } from '#lib/who.ts';

	let { data } = $props();

	let source = $state<'made' | 'upload'>('made');
	let note = $state<DeliveryNote>({
		number: 'DN-2026-0042',
		customer: 'Sample Shop',
		address: 'Tržaška 12\n2000 Maribor',
		items: '48 × Milk 1 l\n24 × Butter 250 g\n36 × Yoghurt 500 g'
	});
	let uploaded = $state<{ name: string; base64: string } | null>(null);
	let made = $state<string | null>(null);
	let tooBig = $state<string | null>(null);
	let who = $state<Who>({ id: '', name: '' });
	onMount(() => (who = loadWho()));
	$effect(() => saveWho(who));
	let answer = $state(null);
	let lastStatus = $state<unknown>(null);

	// The delivery note, made again 400 ms after the last change; a build that finishes late never replaces a newer one.
	let builds = 0;
	$effect(() => {
		const current = { ...note };
		const build = ++builds;
		const timer = setTimeout(async () => {
			const base64 = toBase64(await deliveryNotePdf(current));
			if (build === builds) made = base64;
		}, 400);
		return () => clearTimeout(timer);
	});

	let uploads = 0;
	async function upload(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		const attempt = ++uploads;
		tooBig = null;
		uploaded = null;
		if (!file) return;
		// Checked before reading it: base64 is a third bigger than the file.
		if (file.size > (LIMITS.content * 3) / 4) return (tooBig = `${file.name} is too big for the demo (at most about 1 MB).`);
		const base64 = toBase64(new Uint8Array(await file.arrayBuffer()));
		if (attempt === uploads) uploaded = { name: file.name, base64 };
	}

	const content = $derived(source === 'made' ? made : (uploaded?.base64 ?? null));
	const request = $derived<PrintRequest | null>(
		content && data.printerId
			? cleanRequest({
					document: { content, kind: 'stream', encoding: 'base64' },
					printerId: data.printerId,
					data: { values: {} },
					onBehalfOf: onBehalfOf(who)
				})
			: null
	);
</script>

<svelte:head>
	<title>A PDF you made · Examples · Sedumo for developers</title>
	<meta name="description" content="Send a PDF your system made to an office printer." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">A PDF you made</h1>
		<p class="lead">A PDF from your system, sent with the request, printed as it is.</p>
		{#if data.problem}<p class="problem">{data.problem}</p>{/if}
		{#if data.noToken}
			<p class="problem">This copy of the site has no Sedumo token. Set <code>SEDUMO_TOKEN</code> on its server (see the README).</p>
		{/if}

		<ChoosePrinter {data} onchoose={() => (answer = null)} />

		<fieldset class="source">
			<legend>The PDF</legend>
			<label><input type="radio" bind:group={source} value="made" /> a delivery note made here</label>
			<label><input type="radio" bind:group={source} value="upload" /> a PDF of your own</label>
		</fieldset>

		{#if source === 'made'}
			<div class="row">
				<label>Number <input bind:value={note.number} /></label>
				<label>Customer <input bind:value={note.customer} /></label>
			</div>
			<label>Address <textarea rows="2" bind:value={note.address}></textarea></label>
			<label>Lines <textarea rows="3" bind:value={note.items}></textarea></label>
		{:else}
			<label>PDF file <input type="file" accept="application/pdf,.pdf" onchange={upload} /></label>
			{#if tooBig}<p class="problem">{tooBig}</p>{/if}
		{/if}

		<label>Your name <input bind:value={who.name} placeholder="Shown in Sedumo’s print history" /></label>

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
					Use it when your system makes its own documents: delivery notes, invoices, packing lists. Send the PDF with the
					request as <code>content</code> in base64 (<code>"encoding": "base64"</code>), to a printer set up for PDFs. The
					worker prints it as it is.
				</p>
				<p>The delivery note here is made in your browser with pdf-lib; any PDF library or report tool does the same.</p>
			{/snippet}
			{#snippet notes()}
				<p>
					Up to 14 MB in the request; a bigger file goes through an upload link first, then prints by its hash (see the
					guide). The demo takes files up to about 1 MB.
				</p>
			{/snippet}
		</HowItWorks>
	</section>
</div>

<style>
	.source {
		border: 0;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.3rem;
		font-size: 0.95rem;
	}
	.source legend {
		font-weight: 600;
		padding: 0;
		margin-bottom: 0.25rem;
	}
	.source label {
		display: flex;
		gap: 0.4rem;
		align-items: baseline;
		font-weight: 400;
	}
	.source input {
		width: auto;
	}
</style>
