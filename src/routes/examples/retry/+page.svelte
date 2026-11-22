<script lang="ts">
	import { onMount } from 'svelte';
	import ChooseLabel from '#lib/components/ChooseLabel.svelte';
	import HowItWorks from '#lib/components/HowItWorks.svelte';
	import PrintBox from '#lib/components/PrintBox.svelte';
	import ValueFields from '#lib/components/ValueFields.svelte';
	import { cleanRequest, isIdempotencyKey, type DocumentRef, type PrintRequest } from '#lib/print-request.ts';
	import { loadWho, onBehalfOf, saveWho, type Who } from '#lib/who.ts';

	let { data } = $props();

	let values = $state<Record<string, string>>({});
	$effect(() => {
		for (const v of data.template?.variables ?? []) if (values[v.name] === undefined) values[v.name] = v.example ?? '';
	});
	let naming = $state<'id' | 'path' | 'sha256'>('path');
	// Your app names each print with a key of its own, such as the order line; here it gets a random part, since every
	// visitor of this site prints with the same token.
	const randomPart = () => Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, '0')).join('');
	let key = $state('order-4711-line-2');
	onMount(() => (key = `order-4711-line-2-${randomPart()}`));
	let who = $state<Who>({ id: '', name: '' });
	onMount(() => (who = loadWho()));
	$effect(() => saveWho(who));
	let answer = $state(null);
	let lastStatus = $state<unknown>(null);
	// The steps, ticked by what Sedumo answered: printed, the first answer again, the key refused for another print.
	let steps = $state({ printed: false, replayed: false, refused: false });
	$effect(() => {
		const a = answer as { status: number; replayed?: boolean; body: { code?: string } } | null;
		if (!a) return;
		if (a.status === 201 && !a.replayed) steps.printed = true;
		if (a.status === 201 && a.replayed && steps.printed) steps.replayed = true;
		if (a.status === 422 && a.body.code === 'idempotency_key_reused' && steps.printed) steps.refused = true;
	});
	// Another key or label starts over.
	$effect(() => {
		void key;
		void data.labelId;
		steps = { printed: false, replayed: false, refused: false };
	});

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
					data: { values: Object.fromEntries(variables.map((v) => [v.name, values[v.name] ?? ''])) },
					onBehalfOf: onBehalfOf(who)
				})
			: null
	);
	const newKey = () => {
		key = `order-4712-line-1-${randomPart()}`;
		answer = null;
	};
</script>

<svelte:head>
	<title>A retry that prints once · Examples · Sedumo for developers</title>
	<meta name="description" content="Send a print again after a timeout without printing it twice: Idempotency-Key." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">A retry that prints once</h1>
		<p class="lead">When the answer doesn’t come, send the print again with the same key: it prints once.</p>
		{#if data.problem}<p class="problem">{data.problem}</p>{/if}
		{#if data.noToken}
			<p class="problem">This copy of the site has no Sedumo token. Set <code>SEDUMO_TOKEN</code> on its server (see the README).</p>
		{/if}

		<ChooseLabel {data} bind:naming onchoose={() => (answer = null)} />
		<ValueFields {variables} bind:values />

		<label>
			<span>Idempotency-Key <small>the same for every attempt at this print</small></span>
			<input bind:value={key} maxlength="200" spellcheck="false" />
		</label>
		<button type="button" class="newkey" onclick={newKey}>A new print: a new key</button>

		<ol class="steps">
			<li class:done={steps.printed}>Press Print: it prints.</li>
			<li class:done={steps.replayed}>Press Print again, as an app does after a timeout: the same answer, nothing more prints.</li>
			<li class:done={steps.refused}>Change a value and press Print: the same key for another print is refused.</li>
		</ol>

		<label>Your name <input bind:value={who.name} placeholder="Shown in Sedumo’s print history" /></label>

		<PrintBox {request} size={data.template?.size ?? null} idempotencyKey={key} bind:answer bind:lastStatus />
	</section>

	<section class="how" aria-label="How it works">
		<HowItWorks
			{request}
			{answer}
			{lastStatus}
			apiUrl={data.apiUrl}
			headers={isIdempotencyKey(key) ? { 'Idempotency-Key': key } : {}}
			guides={[{ href: '/guides/api#4-print', text: 'API guide: 4. Print (Idempotency-Key)' }]}
		>
			{#snippet intro()}
				<p>
					Use it for every print an app may send twice. When the answer doesn’t arrive (a timeout, a dropped connection),
					the print may already be queued. Name each print with a key of your own, such as the order line’s id, the same
					for every attempt at that print, in the <code>Idempotency-Key</code> header.
				</p>
				<p>
					The same request with the same key within 24 hours gets the first answer again, the same <code>jobId</code>,
					with <code>Idempotent-Replayed: true</code>, and nothing more prints.
				</p>
			{/snippet}
			{#snippet notes()}
				<p>
					The same key for a different request (another label, printer or values) is refused with <code>422</code>,
					<code>idempotency_key_reused</code>: a new print needs a new key. A refused print (<code>400</code>) used no key.
					Keys are your token’s own, 1 to 200 visible characters.
				</p>
			{/snippet}
		</HowItWorks>
	</section>
</div>

<style>
	.newkey {
		justify-self: start;
		font: inherit;
		font-size: 0.9rem;
		padding: 0.35rem 0.8rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--paper);
		color: var(--ink);
		cursor: pointer;
	}
	.steps {
		margin: 0;
		padding-left: 1.2rem;
		color: var(--muted);
		font-size: 0.95rem;
	}
	.steps li.done {
		color: var(--ink);
	}
	.steps li.done::marker {
		content: '✓ ';
		color: var(--sedumo-green);
	}
</style>
