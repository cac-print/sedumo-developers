<script lang="ts">
	import Code from '#lib/components/Code.svelte';

	const js = `// In the web page: the worker's address from its Edit dialog in Sedumo, and a token valid on workers only.
const worker = 'https://k3f9x2.lan.sedumo.com:7648';
const headers = { Authorization: \`Bearer \${token}\` };

// Before printing: is the worker there, and which printers does it have?
const printers = await fetch(\`\${worker}/printers\`, { headers }).then((r) => r.json());

const answer = await fetch(\`\${worker}/print\`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json', 'Idempotency-Key': key },
  body: JSON.stringify({
    document: { path: 'Product label.template' },
    printerId: printers[0].id,
    data: { values: { product: 'Milk 1 l', best_before: '2026-12-10', lot: 'L2026-10' } }
  })
}).then((r) => r.json());
// Then GET \${worker}/print-jobs/\${answer.jobId} until it's completed or failed.`;
</script>

<svelte:head>
	<title>A web page on the plant network · Examples · Sedumo for developers</title>
	<meta name="description" content="A browser app prints through a Sedumo worker on the plant network over HTTPS, offline too." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">A web page on the plant network</h1>
		<p class="lead">A page in the browser prints through a worker on the plant network, over HTTPS, offline too.</p>
		<p class="problem">
			This one runs on your own network, so it doesn’t print from this site: the code is below, and it works against any
			worker of your account set up as follows.
		</p>

		<h2>Set it up</h2>
		<ol class="setup">
			<li>On the worker: Workers → Edit → turn on <strong>Print from other PCs</strong>. Its address appears there, with a copy button: <code>https://&lt;name&gt;.lan.sedumo.com:7648</code>.</li>
			<li>
				Add your page’s origin, such as <code>https://app.example.com</code>, under Settings → Access → API tokens →
				<strong>Browser apps</strong>.
			</li>
			<li>
				Give the page a token valid <strong>on workers only</strong>. It’s the one kind of token that may be in a browser:
				it can’t reach Sedumo’s cloud.
			</li>
		</ol>

		<h2>The page’s code</h2>
		<Code code={js} label="the code" />
	</section>

	<section class="how" aria-label="How it works">
		<h2>How it works</h2>
		<p>
			Use it for a web app on the shop floor: a packing station, a scale, a tablet at the line. The worker gets a name
			under <code>lan.sedumo.com</code> that points at its address on the plant network, with a certificate every browser
			trusts, so the page calls it over HTTPS like any web API: the same routes and answers as the cloud.
		</p>
		<ul class="small">
			<li>Chrome asks once whether the page may reach devices on the local network; the person clicks Allow.</li>
			<li>
				Some routers block public names that point at local addresses (“DNS rebinding protection”); plant IT then adds an
				exception for <code>lan.sedumo.com</code> (<a href="/guides/plant-it#dns-rebinding-protection">plant IT guide</a>).
			</li>
			<li>
				The certificate lasts 90 days and the worker renews it while online; after about 60 days offline it stops
				answering other PCs until it’s online again. Its own PC keeps printing at <code>127.0.0.1:7647</code>.
			</li>
		</ul>
		<p><a href="/guides/api#from-a-browser-app-on-another-pc">API guide: From a browser app on another PC</a></p>
	</section>
</div>

<style>
	.setup li {
		margin: 0.4rem 0;
	}
	.try h2 {
		font-size: 1.2rem;
		margin: 1rem 0 0;
	}
	.how h2 {
		margin-top: 0;
	}
	.small {
		color: var(--muted);
		font-size: 0.9rem;
		padding-left: 1.1rem;
	}
</style>
