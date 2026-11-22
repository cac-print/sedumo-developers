<script lang="ts">
	import { goto } from '$app/navigation';
	import { printerState } from '#lib/printer-status.ts';
	import type { LabelExample } from '#lib/server/label-example.ts';

	// The printer, with its state as Sedumo last saw it. Choosing one reloads the page's data (?printer=).
	let { data, onchoose }: { data: LabelExample; onchoose?: () => void } = $props();
	const printer = $derived(data.printers.find((p) => p.id === data.printerId) ?? null);

	function choose(id: string) {
		const params = new URLSearchParams(location.search);
		params.set('printer', id);
		goto(`?${params}`, { replace: true, reset: false });
		onchoose?.();
	}
</script>

<label>
	Printer
	<select value={data.printerId} onchange={(e) => choose(e.currentTarget.value)}>
		{#each data.printers as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
	</select>
</label>
{#if printer}
	{@const state = printerState(printer)}
	<p class="state {state.tone}">{state.text}{printer.language ? ` · ${printer.language} ${printer.dpi} dpi` : ''}</p>
{/if}

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
</style>
