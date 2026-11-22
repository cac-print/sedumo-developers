<script lang="ts">
	import { onMount } from 'svelte';
	import ChooseLabel from '#lib/components/ChooseLabel.svelte';
	import HowItWorks from '#lib/components/HowItWorks.svelte';
	import PrintBox from '#lib/components/PrintBox.svelte';
	import ValueFields from '#lib/components/ValueFields.svelte';
	import { cleanRequest, LIMITS, type DocumentRef, type PrintRequest } from '#lib/print-request.ts';
	import { loadWho, onBehalfOf, saveWho, type Who } from '#lib/who.ts';
	import Code from '#lib/components/Code.svelte';
	import { odooModule } from '#lib/odoo.ts';

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
	<title>Odoo · Examples · Sedumo for developers</title>
	<meta name="description" content="Print a Sedumo label from an Odoo delivery order with a small Odoo module." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">Odoo</h1>
		<p class="lead">A Print label button on Odoo’s delivery orders, printing through Sedumo.</p>
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
			codeTabs={false}
			guides={[{ href: '/guides/api#4-print', text: 'API guide: 4. Print' }]}
		>
			{#snippet intro()}
				<p>
					Use it when your warehouse runs on Odoo. Odoo’s server actions can’t call out and its webhooks can’t send
					Sedumo’s request, so a small module does it: a <em>Print label</em> button on the delivery order sends the
					request from Odoo’s server with <code>requests</code>, which Odoo already has. A custom module needs Odoo.sh or
					your own Odoo server; Odoo Online takes none.
				</p>
				<h3>The module</h3>
				<ol>
					<li>The files below in a folder <code>sedumo_print</code> on Odoo’s addons path; your fields in the values.</li>
					<li>
						Settings → Technical → System Parameters (developer mode): <code>sedumo.token</code>, the API token, and
						<code>sedumo.printer_id</code>, the printer’s id in Sedumo (<code>GET /printers</code>).
					</li>
					<li>Apps → Update Apps List, then install <em>Sedumo Print</em>.</li>
				</ol>
				{#if request}
					{#each odooModule(request, data.apiUrl) as file (file.path)}
						<p class="file"><code>{file.path}</code></p>
						<Code code={file.code} label={file.path} />
					{/each}
				{/if}
			{/snippet}
			{#snippet notes()}
				<p>
					Sedumo answers at once with <code>201</code> and the <code>jobId</code>, which the module writes in the delivery
					order’s chatter; a refusal shows as Odoo’s error with Sedumo’s reason. Without an answer (a timeout) the label
					may have printed: look in Sedumo’s print history before pressing again. The button is on delivery orders that
					aren’t cancelled; Sedumo’s print history shows the Odoo user who pressed it.
				</p>
			{/snippet}
		</HowItWorks>
	</section>
</div>

<style>
	.file {
		margin: 1rem 0 0.35rem;
		font-size: 0.9rem;
	}
</style>
