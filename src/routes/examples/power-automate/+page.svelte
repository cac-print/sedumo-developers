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
					Use it when a flow should print: a new item in a SharePoint list, a Forms answer (its values from
					<em>Get response details</em>), an approval, a schedule. The flow’s <em>HTTP</em> action sends the same request
					as any app. It is a Premium action: the people running the flow need Power Automate Premium, or the flow a
					Process licence (a flow in a solution).
				</p>
				<h3>In the flow</h3>
				<ol>
					<li>Add the action <em>HTTP</em>: method <code>POST</code>, URI <code>{data.apiUrl}/print</code>.</li>
					<li>
						Headers: <code>Content-Type</code> <code>application/json</code>, <code>Authorization</code> <code>Bearer</code>
						and the API token, and <code>Idempotency-Key</code> <code>@{'{'}workflow().run.name{'}'}</code>, the run’s
						name. The action tries again by itself after a timeout, a <code>408</code>, <code>429</code> or
						<code>5xx</code> (up to four times); with the key Sedumo answers a retry with the first answer, and the label
						prints once. A run that prints more than one label adds the item’s id to the key.
					</li>
					<li>
						Keep the token out of the flow: a secret environment variable (Azure Key Vault), read with Dataverse’s
						<em>Perform an unbound action</em>, <em>RetrieveEnvironmentVariableSecretValue</em>. Turn on
						<em>Secure outputs</em> on that action and <em>Secure inputs</em> on the HTTP action, so the run history doesn’t
						show it.
					</li>
					<li>
						Body: the request below; put the trigger’s values in with dynamic content: text in quotes,
						<code>"lot": "@{'{'}triggerBody()?['Lot']{'}'}"</code>, a number without,
						<code>"copies": @{'{'}triggerBody()?['Copies']{'}'}</code>.
					</li>
				</ol>
				<p>What to type into the action’s fields, as its code view shows them:</p>
				{#if request}<Code code={httpAction(request, data.apiUrl)} label="the HTTP action" />{/if}
			{/snippet}
			{#snippet notes()}
				<p>
					Sedumo answers at once with <code>201</code> and the <code>jobId</code>; a later step can follow the print with a
					second HTTP action, <code>GET /print-jobs/{'{'}jobId{'}'}</code>. Each trigger and action that runs, retries too,
					counts toward the licence’s Power Platform requests per 24 hours.
				</p>
			{/snippet}
		</HowItWorks>
	</section>
</div>
