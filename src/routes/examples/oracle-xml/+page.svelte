<script lang="ts">
	import ChooseLabel from '#lib/components/ChooseLabel.svelte';
	import Code from '#lib/components/Code.svelte';
	import HowItWorks from '#lib/components/HowItWorks.svelte';
	import PrintBox from '#lib/components/PrintBox.svelte';
	import ValueFields from '#lib/components/ValueFields.svelte';
	import { oracleXml } from '#lib/oracle-xml.ts';
	import { cleanRequest, LIMITS, type PrintRequest } from '#lib/print-request.ts';

	let { data } = $props();

	let values = $state<Record<string, string>>({});
	$effect(() => {
		for (const v of data.template?.variables ?? []) if (values[v.name] === undefined) values[v.name] = v.example ?? '';
	});
	let quantity = $state(1);
	let answer = $state(null);
	let lastStatus = $state<unknown>(null);

	const label = $derived(data.labels.find((l) => l.id === data.labelId) ?? null);
	const printer = $derived(data.printers.find((p) => p.id === data.printerId) ?? null);
	const variables = $derived(data.template?.variables ?? []);
	const xml = $derived(
		label && printer
			? oracleXml({
					format: label.name,
					printerName: printer.name,
					quantity: Math.min(Math.max(Math.round(Number(quantity) || 1), 1), LIMITS.copies),
					labels: [Object.fromEntries(variables.map((v) => [v.name, values[v.name] ?? '']))]
				})
			: null
	);
	// The XML names its printer, so the request has no printerId and no data.
	const request = $derived<PrintRequest | null>(xml ? cleanRequest({ document: { content: xml, kind: 'oracle_xml' } }) : null);
	const asBody = $derived(
		xml
			? `curl ${data.apiUrl}/print \\\n  -H "Authorization: Bearer $SEDUMO_TOKEN" \\\n  -H "Content-Type: application/xml" \\\n  --data-binary @label.xml\n\n# label.xml:\n${xml}`
			: ''
	);
</script>

<svelte:head>
	<title>Oracle WMS XML · Examples · Sedumo for developers</title>
	<meta name="description" content="Print the label XML an Oracle warehouse system already sends." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">Oracle WMS XML</h1>
		<p class="lead">The label XML your warehouse system already sends: it names the label, the printer and the values.</p>
		{#if data.problem}<p class="problem">{data.problem}</p>{/if}
		{#if data.noToken}
			<p class="problem">This copy of the site has no Sedumo token. Set <code>SEDUMO_TOKEN</code> on its server (see the README).</p>
		{/if}

		<ChooseLabel {data} naming={null} onchoose={() => (answer = null)} />
		<ValueFields {variables} bind:values />
		<label><span>Copies (<code>_QUANTITY</code>)</span> <input type="number" min="1" max={LIMITS.copies} bind:value={quantity} /></label>

		<PrintBox {request} size={data.template?.size ?? null} preview={false} bind:answer bind:lastStatus />
	</section>

	<section class="how" aria-label="How it works">
		<HowItWorks
			{request}
			{answer}
			{lastStatus}
			apiUrl={data.apiUrl}
			guides={[{ href: '/guides/api#7-print-a-file-you-made-yourself', text: 'API guide: 7 (Oracle WMS)' }]}
		>
			{#snippet intro()}
				<p>
					Use it when Oracle WMS, or another system that makes this XML, prints labels: point it at Sedumo instead of a
					label server. <code>_FORMAT</code> names the label as it is called in Sedumo (without
					<code>.template</code>), <code>_PRINTERNAME</code> the printer by its name or one of its aliases, and each
					<code>&lt;label&gt;</code> one label’s values. Sedumo checks each label before anything prints.
				</p>
			{/snippet}
			{#snippet notes()}
				<p>
					Here it goes in JSON as <code>content</code> with <code>"kind": "oracle_xml"</code>, without <code>printerId</code>.
					A warehouse system can post the XML itself as the whole body instead:
				</p>
				{#if asBody}<Code code={asBody} label="the XML as the body" />{/if}
			{/snippet}
		</HowItWorks>
	</section>
</div>
