<script lang="ts">
	import { onMount } from 'svelte';
	import ChooseLabel from '#lib/components/ChooseLabel.svelte';
	import HowItWorks from '#lib/components/HowItWorks.svelte';
	import PrintBox from '#lib/components/PrintBox.svelte';
	import ValueFields from '#lib/components/ValueFields.svelte';
	import { cleanRequest, LIMITS, type DocumentRef, type PrintRequest } from '#lib/print-request.ts';
	import { loadWho, onBehalfOf, saveWho, type Who } from '#lib/who.ts';
	import Code from '#lib/components/Code.svelte';
	import { httpAction } from '#lib/power-automate.ts';

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
	<title>Power Automate · Examples · Sedumo for developers</title>
	<meta name="description" content="Print a Sedumo label from a Power Automate flow with its HTTP action." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">Power Automate</h1>
		<p class="lead">A flow prints a label when something happens: a row in a list, a form sent, an email.</p>
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
					Use it when a flow should print: a new row in a SharePoint list or an Excel table, a Forms answer, an approval.
					The flow’s <em>HTTP</em> action sends the same request as any app. It is a Premium action: the flow’s owner
					needs Power Automate Premium, or the flow a Process licence.
				</p>
				<h3>In the flow</h3>
				<ol>
					<li>Add the action <em>HTTP</em>: method <code>POST</code>, URI <code>{data.apiUrl}/print</code>.</li>
					<li>
						Headers: <code>Content-Type</code> <code>application/json</code> and <code>Authorization</code>
						<code>Bearer</code> and the API token. Keep the token out of the flow’s steps: a secret environment variable
						(Azure Key Vault) does.
					</li>
					<li>
						Body: the request below; put the trigger’s values in with dynamic content, e.g.
						<code>"lot": "@{'{'}triggerBody()?['Lot']{'}'}"</code>.
					</li>
				</ol>
				{#if request}<Code code={httpAction(request, data.apiUrl)} label="the HTTP action" />{/if}
			{/snippet}
			{#snippet notes()}
				<p>
					Sedumo answers at once with <code>201</code> and the <code>jobId</code>; a later step can follow the print with a
					second HTTP action, <code>GET /print-jobs/{'{'}jobId{'}'}</code>. Each run counts toward the flow’s daily actions.
				</p>
			{/snippet}
		</HowItWorks>
	</section>
</div>
