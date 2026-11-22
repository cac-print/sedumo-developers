<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.guide.title} · Sedumo for developers</title>
	<meta name="description" content={data.guide.summary} />
</svelte:head>

<div class="page">
	<aside>
		<details open>
			<summary>On this page</summary>
			<ul class="toc">
				{#each data.sections as section (section.id)}
					<li><a href="#{section.id}">{section.text}</a></li>
				{/each}
			</ul>
		</details>
		<h2 class="small">Guides</h2>
		<ul class="guides">
			{#each data.guides as guide (guide.slug)}
				<li>
					<a href="/guides/{guide.slug}" aria-current={guide.slug === data.guide.slug ? 'page' : undefined}
						>{guide.title}</a
					>
				</li>
			{/each}
		</ul>
	</aside>

	<article data-pagefind-body>
		<h1>{data.title}</h1>
		<!-- The guide's text is Sedumo's own manual, rendered when the site is built. -->
		<div class="prose">{@html data.html}</div>
	</article>
</div>

<style>
	.page {
		max-width: 76rem;
		margin: 0 auto;
		padding: 2rem 1rem 0;
		display: grid;
		grid-template-columns: 15rem minmax(0, 1fr);
		gap: 3rem;
	}
	aside {
		position: sticky;
		top: 1rem;
		align-self: start;
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		font-size: 0.9rem;
	}
	summary {
		font-weight: 600;
		cursor: pointer;
		margin-bottom: 0.25rem;
	}
	aside ul {
		list-style: none;
		padding: 0;
		margin: 0 0 1.25rem;
	}
	aside li a {
		display: block;
		padding: 0.25rem 0 0.25rem 0.6rem;
		border-left: 2px solid var(--line);
		color: var(--muted);
		text-decoration: none;
	}
	aside li a:hover {
		color: var(--ink);
	}
	aside li a[aria-current='page'] {
		color: var(--ink);
		border-left-color: var(--link);
		font-weight: 600;
	}
	.small {
		font: 600 0.9rem var(--body);
		letter-spacing: 0;
		margin: 0 0 0.25rem;
	}
	article {
		max-width: 48rem;
	}
	.prose :global(h2) {
		scroll-margin-top: 1rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--line);
	}
	.prose :global(h3) {
		scroll-margin-top: 1rem;
	}
	.prose :global(li) {
		margin: 0.25rem 0;
	}
	.prose :global(li > p) {
		margin: 0.25rem 0;
	}
	@media (max-width: 56rem) {
		.page {
			grid-template-columns: minmax(0, 1fr);
			gap: 0.5rem;
		}
		aside {
			position: static;
			max-height: none;
		}
		.guides,
		.small {
			display: none;
		}
	}
</style>
