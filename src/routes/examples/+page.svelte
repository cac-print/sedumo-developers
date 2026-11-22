<script lang="ts">
	import { EXAMPLES, GROUPS } from '#lib/examples.ts';
</script>

<svelte:head><title>Examples · Sedumo for developers</title></svelte:head>

<h1>Examples</h1>
<p class="lead">
	Every way to print, a page each. Each one prints for real on Sedumo’s demo printers and shows the request it sends.
</p>
{#each GROUPS as group (group)}
	<h2>{group}</h2>
	<ul class="list">
		{#each EXAMPLES.filter((e) => e.group === group) as example (example.slug)}
			<li>
				{#if example.ready}<a href="/examples/{example.slug}">{example.title}</a>{:else}<strong>{example.title}</strong>
					<em>coming soon</em>{/if}
				<span>{example.summary}</span>
			</li>
		{/each}
	</ul>
{/each}

<style>
	.list {
		list-style: none;
		padding: 0;
		max-width: 46rem;
	}
	.list li {
		display: grid;
		gap: 0.15rem;
		padding: 0.6rem 0;
		border-bottom: 1px solid var(--line);
	}
	.list a,
	.list strong {
		font-weight: 600;
	}
	.list em {
		color: var(--muted);
		font-size: 0.85rem;
	}
	.list span {
		color: var(--muted);
	}
</style>
