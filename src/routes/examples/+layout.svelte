<script lang="ts">
	import { page } from '$app/state';
	import '#lib/styles/example.css';
	import { EXAMPLES, GROUPS } from '#lib/examples.ts';
	let { children } = $props();
</script>

<div class="examples">
	<nav aria-label="Examples">
		{#each GROUPS as group (group)}
			<h2>{group}</h2>
			<ul>
				{#each EXAMPLES.filter((e) => e.group === group) as example (example.slug)}
					<li>
						{#if example.ready}
							<a
								href="/examples/{example.slug}"
								aria-current={page.url.pathname === `/examples/${example.slug}` ? 'page' : undefined}
								>{example.title}{#if example.live === false}<small> code</small>{/if}</a
							>
						{:else}
							<span title="Coming soon">{example.title}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/each}
	</nav>
	<div class="case">
		{@render children()}
	</div>
</div>

<style>
	.examples {
		max-width: 90rem;
		margin: 0 auto;
		padding: 2rem 1rem 0;
		display: grid;
		grid-template-columns: 14rem minmax(0, 1fr);
		gap: 2.5rem;
	}
	nav {
		font-size: 0.9rem;
		position: sticky;
		top: 1rem;
		align-self: start;
	}
	nav h2 {
		font: 600 0.8rem var(--body);
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 1.25rem 0 0.35rem;
	}
	nav h2:first-child {
		margin-top: 0;
	}
	nav ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	nav a,
	nav span {
		display: block;
		padding: 0.25rem 0 0.25rem 0.6rem;
		border-left: 2px solid var(--line);
		text-decoration: none;
		color: var(--ink);
	}
	nav a small {
		margin-left: 0.35rem;
		font-size: 0.7rem;
		color: var(--muted);
		border: 1px solid var(--line);
		border-radius: 4px;
		padding: 0 0.25rem;
	}
	nav span {
		color: var(--muted);
		opacity: 0.7;
	}
	nav a[aria-current='page'] {
		border-left-color: var(--link);
		font-weight: 600;
	}
	@media (max-width: 60rem) {
		.examples {
			grid-template-columns: minmax(0, 1fr);
		}
		nav {
			position: static;
			order: 2;
			border-top: 1px solid var(--line);
			padding-top: 1.5rem;
		}
	}
</style>
