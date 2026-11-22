<script lang="ts">
	import { guideHref, PATHS } from '#lib/paths.ts';
	let { data } = $props();
	const guide = (href: string) => guideHref(data.guidesBuilt, href);

	const token = `curl https://api.sedumo.com/printers -H "Authorization: Bearer $SEDUMO_TOKEN"`;
	const print = `curl https://api.sedumo.com/print -H "Authorization: Bearer $SEDUMO_TOKEN" \\
  -H "Content-Type: application/json" -d '{
  "document": { "path": "Product label.template" },
  "printerId": "<printer id>",
  "data": { "values": { "product": "Milk 1 l", "best_before": "2026-12-10", "lot": "L2026-10" }, "copies": 2 }
}'`;
	const follow = `curl https://api.sedumo.com/print-jobs/<jobId> -H "Authorization: Bearer $SEDUMO_TOKEN"`;
</script>

<svelte:head>
	<title>Sedumo for developers</title>
	<meta
		name="description"
		content="Print labels from your software with Sedumo: the API, offline printing through the worker, guides and examples."
	/>
</svelte:head>

<main data-pagefind-body>
	<section class="hero">
		<h1>Print labels from your software</h1>
		<p class="lead">
			Your app sends Sedumo one request: a label, a printer and the values to put on it. A Sedumo worker on a PC next
			to the printer prints it, and keeps printing from the plant’s own network when the internet is down.
		</p>
	</section>

	<section aria-labelledby="first">
		<h2 id="first">Print your first label</h2>
		<ol class="steps">
			<li>
				<h3>Make a token</h3>
				<p>
					In Sedumo, an owner or admin opens <strong>Settings → Access → API tokens → New token</strong> and ticks
					<code>printers:read</code>, <code>print</code> and <code>jobs:read</code>. Keep the token on your server,
					never in a browser or a mobile app.
				</p>
			</li>
			<li>
				<h3>Find a printer</h3>
				<pre><code>{token}</code></pre>
				<p>Keep the printer’s <code>id</code>.</p>
			</li>
			<li>
				<h3>Print</h3>
				<pre><code>{print}</code></pre>
				<p>Sedumo answers as soon as the print is queued, with its <code>jobId</code>.</p>
			</li>
			<li>
				<h3>Follow it</h3>
				<pre><code>{follow}</code></pre>
				<p>Until it is <code>completed</code>, or <code>failed</code> with the reason.</p>
			</li>
		</ol>
		<p><a href={guide('/guides/api')}>The API guide</a> explains each step, with every option.</p>
	</section>

	<section aria-labelledby="paths">
		<h2 id="paths">What are you building?</h2>
		<ul class="cards">
			{#each PATHS as path (path.href)}
				<li>
					<a href={guide(path.href)}>
						<strong>{path.title}</strong>
						<span>{path.text}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="reference">
		<h2 id="reference">Reference</h2>
		<ul class="plain">
			<li><a href="https://api.sedumo.com/docs">Every route of the API</a>, with its request and answer.</li>
			<li><a href="/skill">A skill for AI coding assistants</a>: teach Claude Code, Codex, Cursor, Gemini CLI or Copilot how to build on Sedumo.</li>
			<li><a href={guide('/guides/limits')}>Limits</a>: every size, count and period, and what depends on your plan.</li>
			<li><a href="https://status.sedumo.com">Status</a>: whether Sedumo is up, and any planned maintenance.</li>
		</ul>
	</section>
</main>

<style>
	main {
		max-width: 76rem;
		margin: 0 auto;
		padding: 2.5rem 1rem 0;
	}
	.hero {
		padding-bottom: 0.5rem;
	}
	.steps {
		list-style: none;
		counter-reset: step;
		padding: 0;
		max-width: 52rem;
	}
	.steps li {
		counter-increment: step;
		position: relative;
		padding-left: 2.75rem;
		margin-bottom: 1.25rem;
	}
	.steps li::before {
		content: counter(step);
		position: absolute;
		left: 0;
		top: 0.1rem;
		width: 1.9rem;
		height: 1.9rem;
		border-radius: 50%;
		background: var(--soft);
		color: var(--ink);
		display: grid;
		place-items: center;
		font: 700 1rem var(--display);
	}
	.steps h3 {
		margin: 0 0 0.35rem;
		padding-top: 0.2rem;
	}
	.steps p {
		margin: 0.4rem 0;
	}
	.steps pre {
		margin: 0.5rem 0;
	}
	.cards {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
		gap: 1rem;
	}
	.cards a {
		display: grid;
		gap: 0.35rem;
		height: 100%;
		padding: 1rem 1.1rem;
		border: 1px solid var(--line);
		border-radius: 12px;
		text-decoration: none;
		color: var(--ink);
		transition: border-color 0.15s;
	}
	.cards a:hover {
		border-color: var(--link);
	}
	.cards strong {
		font: 700 1.05rem var(--display);
		color: var(--link);
	}
	.cards span {
		color: var(--muted);
		font-size: 0.95rem;
	}
	.plain {
		padding-left: 1.1rem;
	}
</style>
