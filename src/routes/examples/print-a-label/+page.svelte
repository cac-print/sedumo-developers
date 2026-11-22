<script lang="ts">
	import { goto } from '$app/navigation';
	import Code from '#lib/components/Code.svelte';
	import Preview from '#lib/components/Preview.svelte';
	import PrintStatus from '#lib/components/PrintStatus.svelte';
	import { cleanRequest, curlFor, LIMITS, type DocumentRef, type PrintRequest } from '#lib/print-request.ts';
	import { printerState } from '#lib/printer-status.ts';
	import { onMount } from 'svelte';

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

	// Who prints: this site has no users, so it asks for a name and keeps it in this browser with an id of its own.
	let who = $state({ id: '', name: '' });
	onMount(() => {
		try {
			const kept = JSON.parse(localStorage.getItem('sedumo-examples-who') ?? 'null');
			who = kept?.id ? kept : { id: crypto.randomUUID().slice(0, 8), name: '' };
		} catch {
			who = { id: crypto.randomUUID().slice(0, 8), name: '' };
		}
	});
	$effect(() => {
		try {
			if (who.id) localStorage.setItem('sedumo-examples-who', JSON.stringify(who));
		} catch {
			// no storage: the name is asked again next time
		}
	});

	const label = $derived(data.labels.find((l) => l.id === data.labelId) ?? null);
	const printer = $derived(data.printers.find((p) => p.id === data.printerId) ?? null);
	const variables = $derived(data.template?.variables ?? []);
	const documentRef = $derived<DocumentRef | null>(
		label
			? naming === 'id'
				? { id: label.id }
				: naming === 'sha256'
					? { sha256: label.sha256 }
					: { path: label.path }
			: null
	);
	const request = $derived<PrintRequest | null>(
		documentRef && printer
			? cleanRequest({
					document: documentRef,
					printerId: printer.id,
					data: {
						values: Object.fromEntries(variables.map((v) => [v.name, values[v.name] ?? ''])),
						copies: Math.min(Math.max(Math.round(Number(copies) || 1), 1), LIMITS.copies)
					},
					onBehalfOf: who.name ? { id: who.id, name: who.name } : undefined,
					settings: { darkness, speedMmS: speed }
				})
			: null
	);

	function choose(key: 'printer' | 'label', id: string) {
		const params = new URLSearchParams({ printer: data.printerId ?? '', label: data.labelId ?? '', [key]: id });
		goto(`?${params}`, { replace: true, reset: false });
		answer = null;
	}

	let sending = $state(false);
	let answer = $state<{ status: number; body: { jobId?: string } & Record<string, unknown> } | null>(null);
	let lastStatus = $state<unknown>(null);
	async function print() {
		if (!request) return;
		sending = true;
		answer = null;
		lastStatus = null;
		try {
			const response = await fetch('/examples/print', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(request)
			});
			answer = await response.json().then(
				(body) => (response.ok ? body : { status: response.status, body }),
				() => ({ status: response.status, body: { message: 'This site couldn’t send it.' } })
			);
		} catch {
			answer = { status: 0, body: { message: 'This site couldn’t reach its server. It may or may not have printed.' } };
		} finally {
			sending = false;
		}
	}
	const jobId = $derived(answer?.status === 201 ? answer.body.jobId : undefined);
</script>

<svelte:head>
	<title>Print a label · Examples · Sedumo for developers</title>
	<meta name="description" content="Print a label designed in Sedumo: a document, a printer and the values." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">Print a label</h1>
		<p class="lead">A label designed in Sedumo, a printer, and the values to put on it: one request.</p>
		{#if data.problem}
			<p class="refused">{data.problem}</p>
		{/if}
		{#if data.noToken}
			<p class="refused">This copy of the site has no Sedumo token. Set <code>SEDUMO_TOKEN</code> on its server (see the README).</p>
		{/if}

		<label>
			Printer
			<select value={data.printerId} onchange={(e) => choose('printer', e.currentTarget.value)}>
				{#each data.printers as p (p.id)}
					<option value={p.id}>{p.name}</option>
				{/each}
			</select>
		</label>
		{#if printer}
			{@const state = printerState(printer)}
			<p class="state {state.tone}">{state.text}{printer.language ? ` · ${printer.language} ${printer.dpi} dpi` : ''}</p>
		{/if}

		<label>
			Label
			<select value={data.labelId} onchange={(e) => choose('label', e.currentTarget.value)}>
				{#each data.labels as l (l.id)}
					<option value={l.id}>{l.name}</option>
				{/each}
			</select>
		</label>

		<fieldset class="naming">
			<legend>Name the label by</legend>
			<label><input type="radio" bind:group={naming} value="path" /> its path</label>
			<label><input type="radio" bind:group={naming} value="id" /> its id</label>
			<label><input type="radio" bind:group={naming} value="sha256" /> this exact version</label>
		</fieldset>

		{#each variables as v (v.name)}
			<label>
				<span>{v.caption ?? v.name} {#if v.required}<small>required</small>{/if}</span>
				{#if v.input === 'choice'}
					<input list="choices-{v.name}" bind:value={values[v.name]} />
					<datalist id="choices-{v.name}">
						{#each v.choices ?? [] as choice (choice)}<option value={choice}></option>{/each}
					</datalist>
				{:else}
					<input
						bind:value={values[v.name]}
						inputmode={v.input === 'number' ? 'decimal' : undefined}
						placeholder={v.input === 'date' ? '2026-12-10' : undefined}
					/>
				{/if}
				{#if v.help}<small>{v.help}</small>{/if}
			</label>
		{/each}

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

		<Preview {request} size={data.template?.size ?? null} />

		<button class="print" type="button" disabled={!request || sending} onclick={print}>
			{sending ? 'Sending…' : 'Print'}
		</button>

		{#if answer && answer.status !== 201}
			<p class="refused" role="alert">
				<strong>Refused ({answer.status})</strong>: {String(answer.body.message ?? 'see the answer')}
			</p>
		{/if}
		{#if jobId}
			<PrintStatus {jobId} onstatus={(s) => (lastStatus = s)} />
		{/if}
		<p class="note">Demo printers: everyone prints to the same ones, so don’t enter real data.</p>
	</section>

	<section class="how" aria-labelledby="how">
		<h2 id="how">How it works</h2>
		<p>
			Use it when your system knows what to print and a person or a process says when: a product, a parcel, a pallet.
			The label is designed in Sedumo; your app sends only its name, the printer and the values. Sedumo picks the
			label’s version for that printer’s language, and the worker next to the printer fills it in and prints it.
		</p>

		<h3>The request</h3>
		{#if request}
			<Code code={curlFor(request, '/print', data.apiUrl)} label="the request" />
		{/if}
		<p class="small">
			From your server, with your token. A value left out prints empty; a required one left out, or a choice not on
			its list, is refused with the reason.
		</p>

		<h3>What comes back</h3>
		{#if answer}
			<Code code={`HTTP ${answer.status}\n${JSON.stringify(answer.body, null, 2)}`} label="the answer" />
		{:else}
			<p class="small">Press Print: Sedumo answers as soon as the print is queued, with its <code>jobId</code>.</p>
		{/if}

		{#if jobId}
			<h3>Follow it</h3>
			<Code
				code={`curl ${data.apiUrl}/print-jobs/${jobId} \\\n  -H "Authorization: Bearer $SEDUMO_TOKEN"${lastStatus ? `\n\n${JSON.stringify(lastStatus, null, 2)}` : ''}`}
				label="the status request"
			/>
		{/if}

		<p><a href="/guides/api#4-print">API guide: 4. Print</a> · <a href="/guides/api#6-follow-a-print">6. Follow a print</a></p>
	</section>
</div>

<style>
	.columns {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 2.5rem;
		align-items: start;
	}
	.try {
		display: grid;
		gap: 0.9rem;
	}
	h1 {
		margin-bottom: 0;
	}
	.lead {
		margin: 0;
	}
	label {
		display: grid;
		gap: 0.25rem;
		font-weight: 600;
		font-size: 0.95rem;
	}
	label small {
		font-weight: 400;
		color: var(--muted);
	}
	input,
	select {
		width: 100%;
		min-width: 0;
		font: inherit;
		font-weight: 400;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--paper);
		color: var(--ink);
	}
	.naming {
		border: 0;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		font-size: 0.95rem;
	}
	.naming legend {
		font-weight: 600;
		padding: 0;
		margin-bottom: 0.25rem;
	}
	.naming input {
		width: auto;
	}
	.naming label {
		display: flex;
		gap: 0.35rem;
		align-items: center;
		font-weight: 400;
	}
	.row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.9rem;
	}
	details summary {
		cursor: pointer;
		font-weight: 600;
		font-size: 0.95rem;
	}
	details .row {
		margin-top: 0.6rem;
	}
	.state {
		margin: -0.5rem 0 0;
		font-size: 0.9rem;
	}
	.state::before {
		content: '●';
		margin-right: 0.35rem;
	}
	.state.ok::before {
		color: var(--sedumo-green);
	}
	.state.warn::before {
		color: var(--sedumo-amber);
	}
	.state.bad::before {
		color: var(--sedumo-coral);
	}
	.state.quiet::before {
		color: var(--sedumo-grey);
	}
	.print {
		font: 600 1rem var(--body);
		padding: 0.65rem 1.2rem;
		border: 0;
		border-radius: 8px;
		background: var(--sedumo-green);
		color: #fff;
		cursor: pointer;
		justify-self: start;
	}
	.print:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.refused {
		margin: 0;
		padding: 0.6rem 0.8rem;
		border-radius: 8px;
		background: var(--sunken);
		border-left: 4px solid var(--sedumo-coral);
	}
	.note,
	.small {
		color: var(--muted);
		font-size: 0.9rem;
		margin: 0;
	}
	.how h2 {
		margin-top: 0;
	}
	.how h3 {
		margin-top: 1.5rem;
	}
	@media (max-width: 75rem) {
		.columns {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
