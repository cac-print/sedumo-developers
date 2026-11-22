<script lang="ts">
	import { goto } from '$app/navigation';
	import ChoosePrinter from './ChoosePrinter.svelte';
	import type { LabelExample } from '#lib/server/label-example.ts';

	// The printer with its state, the label, and how the request names the label.
	let {
		data,
		naming = $bindable('path'),
		onchoose
	}: { data: LabelExample; naming?: 'id' | 'path' | 'sha256' | null; onchoose?: () => void } = $props();

	function chooseLabel(id: string) {
		const params = new URLSearchParams(location.search);
		params.set('label', id);
		goto(`?${params}`, { replace: true, reset: false });
		onchoose?.();
	}
</script>

<ChoosePrinter {data} {onchoose} />

<label>
	Label
	<select value={data.labelId} onchange={(e) => chooseLabel(e.currentTarget.value)}>
		{#each data.labels as l (l.id)}<option value={l.id}>{l.name}</option>{/each}
	</select>
</label>

{#if naming !== null}
<fieldset class="naming">
	<legend>Name the label by</legend>
	<label><input type="radio" bind:group={naming} value="path" /> its path</label>
	<label><input type="radio" bind:group={naming} value="id" /> its id</label>
	<label><input type="radio" bind:group={naming} value="sha256" /> this exact version</label>
</fieldset>
{/if}

<style>
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
