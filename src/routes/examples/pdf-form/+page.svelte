<script lang="ts">
	import { onMount } from 'svelte';
	import ChoosePrinter from '#lib/components/ChoosePrinter.svelte';
	import HowItWorks from '#lib/components/HowItWorks.svelte';
	import PrintBox from '#lib/components/PrintBox.svelte';
	import { cleanRequest, type PrintRequest } from '#lib/print-request.ts';
	import { loadWho, onBehalfOf, saveWho, type Who } from '#lib/who.ts';

	let { data } = $props();

	// The sample form's fields (setup/files/tyre-storage-receipt.pdf): your app knows its own form's field names.
	const FIELDS: [string, string, string][] = [
		['id', 'Receipt number', '1042'],
		['name', 'Name', 'Ana Novak'],
		['company', 'Company', 'Sample Garage Ltd'],
		['phone', 'Phone', '041 555 123'],
		['vehicle', 'Vehicle and plate', 'VW Golf, LJ AB-123'],
		['brand', 'Brand', 'Michelin'],
		['size', 'Size', '205/55 R16'],
		['count', 'Number of tyres', '4'],
		['date', 'Date', '22.11.2026'],
		['storage', 'Storage place', 'A-12-3']
	];
	let values = $state<Record<string, string>>(Object.fromEntries(FIELDS.map(([name, , example]) => [name, example])));
	let who = $state<Who>({ id: '', name: '' });
	onMount(() => (who = loadWho()));
	$effect(() => saveWho(who));
	let answer = $state(null);
	let lastStatus = $state<unknown>(null);

	const file = $derived(data.files.find((f) => f.id === data.fileId) ?? null);
	const request = $derived<PrintRequest | null>(
		file && data.printerId
			? cleanRequest({ document: { path: file.path }, printerId: data.printerId, data: { values }, onBehalfOf: onBehalfOf(who) })
			: null
	);
</script>

<svelte:head>
	<title>A PDF form · Examples · Sedumo for developers</title>
	<meta name="description" content="A PDF whose form fields take the print's values." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">A PDF form</h1>
		<p class="lead">A PDF with form fields, stored in Sedumo; each print fills them with its values.</p>
		{#if data.problem}<p class="problem">{data.problem}</p>{/if}
		{#if data.noToken}
			<p class="problem">This copy of the site has no Sedumo token. Set <code>SEDUMO_TOKEN</code> on its server (see the README).</p>
		{/if}

		<p class="count">The form: <strong>{file?.name ?? 'not in this account'}</strong>, a tyre storage receipt with a slip for the stored tyres.</p>
		<ChoosePrinter {data} onchoose={() => (answer = null)} />

		<div class="row">
			{#each FIELDS as [name, caption] (name)}
				<label>{caption} <input bind:value={values[name]} /></label>
			{/each}
		</div>
		<label>Your name <input bind:value={who.name} placeholder="Shown in Sedumo’s print history" /></label>

		<PrintBox {request} size={null} preview={false} bind:answer bind:lastStatus />
	</section>

	<section class="how" aria-label="How it works">
		<HowItWorks
			{request}
			{answer}
			{lastStatus}
			apiUrl={data.apiUrl}
			guides={[{ href: '/guides/api#4-print', text: 'API guide: 4. Print' }]}
		>
			{#snippet intro()}
				<p>
					Use it for documents that are already forms: receipts, delivery notes, certificates made in Word, LibreOffice or
					Acrobat. Upload the PDF once; your app sends the values by the form fields’ names, as it would for a label, and
					the worker fills the fields in before printing. Many records print many filled copies.
				</p>
			{/snippet}
			{#snippet notes()}
				<p>
					A field takes the value of the same name; a field used twice (here the receipt and its slip) gets it in both
					places. It prints on a printer set up for PDFs.
				</p>
			{/snippet}
		</HowItWorks>
	</section>
</div>
