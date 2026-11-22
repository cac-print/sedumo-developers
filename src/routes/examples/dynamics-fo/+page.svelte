<script lang="ts">
	import ChoosePrinter from '#lib/components/ChoosePrinter.svelte';
	import Code from '#lib/components/Code.svelte';
	import HowItWorks from '#lib/components/HowItWorks.svelte';
	import PrintBox from '#lib/components/PrintBox.svelte';
	import { base64Of, fillLayout, FO_BODY, layoutFields } from '#lib/fo-layout.ts';
	import type { PrintRequest } from '#lib/print-request.ts';

	let { data } = $props();

	// A license plate label as F&O's label layouts write it: ZPL, with $Field$ where a value goes.
	let layout = $state(
		[
			'^XA',
			'^CI28',
			'^FO40,30^A0N,34,34^FDLicense plate^FS',
			'^FO40,80^BY2^BCN,110,Y,N,N^FD$LicensePlateId$^FS',
			'^FO40,250^A0N,30,30^FDItem $ItemId$^FS',
			'^FO40,290^A0N,30,30^FDQuantity $Qty$ $Unit$^FS',
			'^XZ'
		].join('\n')
	);
	let values = $state<Record<string, string>>({ LicensePlateId: 'LP-000123', ItemId: 'A0001', Qty: '24', Unit: 'pcs' });
	let answer = $state(null);
	let lastStatus = $state<unknown>(null);

	const fields = $derived(layoutFields(layout));
	// What F&O sends: the filled label in base64, the label printer's external name (here its Sedumo id), no values.
	const request = $derived<PrintRequest | null>(
		data.printerId
			? {
					document: { content: base64Of(fillLayout(layout, values)), kind: 'stream', encoding: 'base64' },
					printerId: data.printerId,
					data: { values: {} }
				}
			: null
	);
	const PATH = '/print?successStatus=200';
</script>

<svelte:head>
	<title>Dynamics 365 F&amp;O labels · Examples · Sedumo for developers</title>
	<meta
		name="description"
		content="Dynamics 365 Supply Chain Management sends its warehouse labels to Sedumo through its external label service, set up without code."
	/>
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">Dynamics 365 F&amp;O labels</h1>
		<p class="lead">Your warehouse labels from Dynamics 365, sent to Sedumo by Dynamics itself: set up, no code.</p>
		{#if data.problem}<p class="problem">{data.problem}</p>{/if}
		{#if data.noToken}
			<p class="problem">This copy of the site has no Sedumo token. Set <code>SEDUMO_TOKEN</code> on its server (see the README).</p>
		{/if}

		<ChoosePrinter {data} onchoose={() => (answer = null)} />

		<label>
			<span>The label layout <small><code>$Field$</code> is a value Dynamics fills in</small></span>
			<textarea rows="9" bind:value={layout} spellcheck="false"></textarea>
		</label>
		{#each fields as field (field)}
			<label>{field} <input bind:value={values[field]} /></label>
		{/each}

		<PrintBox {request} size={null} preview={false} successStatus={200} bind:answer bind:lastStatus />
	</section>

	<section class="how" aria-label="How it works">
		<HowItWorks
			{request}
			{answer}
			{lastStatus}
			apiUrl={data.apiUrl}
			path={PATH}
			codeTabs={false}
			guides={[{ href: '/guides/api#4-print', text: 'API guide: 4. Print' }]}
		>
			{#snippet intro()}
				<p>
					Use it when your warehouse runs on Dynamics 365 Finance and Operations (Supply Chain Management 10.0.34 or
					newer). Its <em>external label printing service</em> sends each label to a service like Sedumo instead of the
					Document Routing Agent: it fills the label layout’s <code>$Field$</code> values and sends the ZPL as base64, with
					the label printer’s external name. This page sends the same.
				</p>
				<h3>Set it up in Dynamics 365</h3>
				<ol>
					<li>In Sedumo, an API token that may print: Settings → Access → API tokens.</li>
					<li>
						<em>Warehouse management → Setup → External services:</em> a service definition with a print operation:
						<code>POST</code>, relative URL <code>{PATH}</code>, body Raw, content type <code>application/json</code>,
						the header <code>Authorization</code> with <code>Bearer $auth.secret$</code>, and this body:
						<Code code={FO_BODY} label="the body" />
					</li>
					<li>A service instance of it: base URL <code>{data.apiUrl}</code>, secret the API token.</li>
					<li>
						Each label printer: connection type <em>External label service</em>, that instance, and as its external
						printer name the printer’s id in Sedumo (<code>GET /printers</code>).
					</li>
					<li>
						Label layouts in ZPL (<em>Warehouse management → Setup → Document routing → Label layout</em>), with
						<code>$Field$</code> where a value goes.
					</li>
				</ol>
			{/snippet}
			{#snippet notes()}
				<p>
					<code>successStatus=200</code>: Dynamics counts only <code>200</code> as success, so Sedumo answers a queued
					print with <code>200</code> instead of its usual <code>201</code>. Base64 keeps the ZPL exactly as Dynamics made
					it, <code>^FH\</code> and line breaks too. Dynamics logs each request in <em>External service request log</em>.
				</p>
			{/snippet}
		</HowItWorks>
	</section>
</div>
