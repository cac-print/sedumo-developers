<script lang="ts">
	import type { Variable } from '#lib/server/sedumo.ts';
	// An editor per field, from the label's own settings. Nothing is checked here, so a developer sees Sedumo refuse a
	// missing required value or a choice that isn't on the list.
	let { variables, values = $bindable() }: { variables: Variable[]; values: Record<string, string> } = $props();
</script>

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
