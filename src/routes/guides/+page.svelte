<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Guides · Sedumo for developers</title>
	<meta name="description" content="Sedumo's guides for developers and plant IT." />
</svelte:head>

<main data-pagefind-body>
	<h1>Guides</h1>
	<p class="lead">How to build on Sedumo, and how to run the workers that print.</p>

	{#if !data.built}
		<p class="note">
			This copy of the site was built without Sedumo’s guides. Read them at
			<a href="https://developers.sedumo.com/guides">developers.sedumo.com</a>.
		</p>
	{/if}

	<ul>
		{#each data.guides as guide (guide.slug)}
			<li>
				{#if data.built}<a href="/guides/{guide.slug}">{guide.title}</a>{:else}<strong>{guide.title}</strong>{/if}
				<span>{guide.summary}</span>
			</li>
		{/each}
	</ul>
</main>

<style>
	main {
		max-width: 76rem;
		margin: 0 auto;
		padding: 2.5rem 1rem 0;
	}
	ul {
		list-style: none;
		padding: 0;
		max-width: 46rem;
	}
	li {
		display: grid;
		gap: 0.2rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--line);
	}
	li a,
	li strong {
		font: 700 1.15rem var(--display);
	}
	li span {
		color: var(--muted);
	}
	.note {
		border-left: 3px solid var(--link);
		background: var(--sunken);
		padding: 0.5rem 0.9rem;
		max-width: 46rem;
	}
</style>
