<script lang="ts">
	import { goto } from '$app/navigation';
	import { printerState } from '#lib/printer-status.ts';
	import type { LabelExample } from '#lib/server/label-example.ts';

	// The printer with its state, the label, and how the request names the label.
	let {
		data,
		naming = $bindable('path'),
		onchoose
	}: { data: LabelExample; naming?: 'id' | 'path' | 'sha256'; onchoose?: () => void } = $props();

	const printer = $derived(data.printers.find((p) => p.id === data.printerId) ?? null);

	function choose(key: 'printer' | 'label', id: string) {
		const params = new URLSearchParams({ printer: data.printerId ?? '', label: data.labelId ?? '', [key]: id });
		goto(`?${params}`, { replace: true, reset: false });
		onchoose?.();
	}
</script>

<label>
	Printer
	<select value={data.printerId} onchange={(e) => choose('printer', e.currentTarget.value)}>
		{#each data.printers as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
	</select>
</label>
{#if printer}
	{@const state = printerState(printer)}
	<p class="state {state.tone}">{state.text}{printer.language ? ` · ${printer.language} ${printer.dpi} dpi` : ''}</p>
{/if}

<label>
	Label
	<select value={data.labelId} onchange={(e) => choose('label', e.currentTarget.value)}>
		{#each data.labels as l (l.id)}<option value={l.id}>{l.name}</option>{/each}
	</select>
</label>

<fieldset class="naming">
	<legend>Name the label by</legend>
	<label><input type="radio" bind:group={naming} value="path" /> its path</label>
	<label><input type="radio" bind:group={naming} value="id" /> its id</label>
	<label><input type="radio" bind:group={naming} value="sha256" /> this exact version</label>
</fieldset>

<style>
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
	.naming label {
		display: flex;
		gap: 0.35rem;
		align-items: center;
		font-weight: 400;
	}
	.naming input {
		width: auto;
	}
</style>
