<script lang="ts">
	let { data, form } = $props();
</script>

<svelte:head>
	<title>Use my account · Sedumo for developers</title>
	<meta name="description" content="Print the examples on your own Sedumo account: your printers and your labels, with a token of a day." />
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<h1>Use my account</h1>
	<p class="lead">
		The examples print on Sedumo’s demo printers. To try them on your own printers, with your own labels, paste an API
		token of your Sedumo account.
	</p>

	{#if data.ownAccount}
		<p class="state" role="status"><strong>The examples use your account.</strong> Each print is real: it prints on your printers.</p>
		<form method="POST" action="?/stop&from={encodeURIComponent(data.back)}">
			<button class="secondary">Stop, back to the demo</button>
		</form>
		<p>Then revoke the token in Sedumo, or let it expire.</p>
	{:else}
		<h2>1. Make a token in Sedumo</h2>
		<p>An owner or admin of your Sedumo account makes it:</p>
		<ol>
			<li>Open <strong>Settings → Access → API tokens</strong> and click <strong>New token</strong>.</li>
			<li>Give it a name, for example “developers.sedumo.com”.</li>
			<li>
				What it may do: <strong>List printers</strong>, <strong>Read documents</strong>, <strong>Print</strong> and
				<strong>Read the status of its own prints</strong>. Nothing else.
			</li>
			<li>Which printers, documents and workers: <strong>All</strong>, or <strong>Only these tags</strong> for the ones to try.</li>
			<li>Valid on: <strong>Cloud</strong>. Expires: <strong>a day</strong>.</li>
			<li>Click <strong>Create token</strong> and copy it.</li>
		</ol>

		<h2>2. Paste it here</h2>
		<form method="POST" action="?/use&from={encodeURIComponent(data.back)}">
			<label for="token">API token</label>
			<input
				id="token"
				name="token"
				type="password"
				autocomplete="off"
				spellcheck="false"
				placeholder="sedumo_mt_…"
				aria-describedby={form?.problem ? 'problem' : undefined}
				required
			/>
			{#if form?.problem}<p id="problem" class="problem" role="alert">{form.problem}</p>{/if}
			<button>Use my account</button>
		</form>
	{/if}

	<h2>What happens with your token</h2>
	<ul>
		<li>
			It’s kept in this browser, in a cookie the site’s pages can’t read, for a day at most or until you click
			<strong>Stop</strong>.
		</li>
		<li>
			Your browser sends it with each request to this site’s server, which uses it for that request only, to call Sedumo,
			the way your own server would. It’s never stored or logged. The code is
			<a href="https://github.com/sedumo/developers/blob/main/src/lib/server/env.ts">on GitHub</a>.
		</li>
		<li>
			This site can’t see what else a token may do, or when it expires: make one only for this, as above.
		</li>
		<li>Anyone who uses this browser while it’s kept can print with it. On a shared computer, click <strong>Stop</strong> when done.</li>
	</ul>

	<h2>What changes</h2>
	<ul>
		<li>The examples list your printers and your labels, and print on them.</li>
		<li>
			Examples made for the demo’s sample labels and files use one of yours instead, or say it isn’t in your account.
		</li>
		<li>The demo’s limits stay: a few labels a print and short values. Your app has only your plan’s limits.</li>
		<li>
			To have the demo’s sample labels and files in your account too, see
			<a href="https://github.com/sedumo/developers#sample-labels">Sample labels</a> in this site’s code.
		</li>
	</ul>
</main>

<style>
	main {
		max-width: 48rem;
		margin: 0 auto;
		padding: 2.5rem 1rem 0;
	}
	form {
		display: grid;
		gap: 0.5rem;
		max-width: 32rem;
		margin: 1rem 0;
	}
	input {
		font: 1rem var(--mono);
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--paper);
		color: inherit;
	}
	button {
		justify-self: start;
		font: 600 1rem var(--body);
		padding: 0.65rem 1.2rem;
		border: 0;
		border-radius: 8px;
		background: var(--sedumo-green);
		color: #fff;
		cursor: pointer;
	}
	button.secondary {
		background: transparent;
		color: inherit;
		border: 1px solid var(--line);
	}
	.state {
		border-left: 3px solid var(--sedumo-green);
		background: var(--sunken);
		padding: 0.5rem 0.9rem;
	}
	.problem {
		margin: 0;
		padding: 0.6rem 0.8rem;
		border-radius: 8px;
		background: var(--sunken);
		border-left: 4px solid var(--sedumo-coral);
	}
</style>
