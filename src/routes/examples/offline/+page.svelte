<script lang="ts">
	import Code from '#lib/components/Code.svelte';

	const curl = `curl http://127.0.0.1:7647/print \\
  -H "Authorization: Bearer $SEDUMO_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-4711-line-2" \\
  -d '{
  "document": { "path": "Product label.template" },
  "printerId": "<printer id>",
  "data": { "values": { "product": "Milk 1 l", "best_before": "2026-12-10", "lot": "L2026-10" } }
}'`;

	const node = `// The cloud first. The worker only when the cloud can't be reached at all: after a timeout the cloud may
// already have queued the print, and a worker doesn't know the cloud's keys, so sending it there would print twice.
const CLOUD = 'https://api.sedumo.com';
const WORKER = process.env.SEDUMO_WORKER_URL ?? 'http://127.0.0.1:7647';
const UNREACHABLE = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH'];

const send = (base, request, key) =>
  fetch(\`\${base}/print\`, {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${process.env.SEDUMO_TOKEN}\`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(10_000)
  });

async function print(request, key) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Any answer, even a refusal, is the cloud's decision.
      return { via: 'cloud', response: await send(CLOUD, request, key) };
    } catch (error) {
      if (UNREACHABLE.includes(error.cause?.code)) {
        // The request never reached Sedumo: the worker prints it.
        return { via: 'worker', response: await send(WORKER, request, key) };
      }
      // A timeout or a dropped connection: the same key makes trying the cloud again safe.
    }
  }
  throw new Error('No answer from Sedumo: the print may be queued; check it before sending it anywhere else');
}`;
</script>

<svelte:head>
	<title>Printing without the internet · Examples · Sedumo for developers</title>
	<meta name="description" content="Send the same print requests to the Sedumo worker on the plant network when the cloud can't be reached." />
</svelte:head>

<div class="columns">
	<section class="try" aria-labelledby="try">
		<h1 id="try">Printing without the internet</h1>
		<p class="lead">The same requests, sent to the Sedumo worker on the plant network when the cloud can’t be reached.</p>
		<p class="problem">
			This one runs on your own network, so it doesn’t print from this site: the code is below, and it works against any
			worker of your account.
		</p>

		<h2>Set it up</h2>
		<ol class="setup">
			<li>
				Make the app’s token valid <strong>on the workers</strong> too: Settings → Access → API tokens, “Where it works”:
				both.
			</li>
			<li>
				Make sure the worker has the labels before the internet goes: it keeps a label it printed before, and labels
				kept there in advance by tag (your admin sets that up). A label it doesn’t have is refused with <code>409</code>.
			</li>
			<li>
				The worker answers on its own PC at <code>http://127.0.0.1:7647</code>. To reach it from other PCs, plant IT
				lets it listen on the network (see the <a href="/guides/plant-it#the-local-print-api">plant IT guide</a>).
			</li>
		</ol>

		<h2>Send to the worker</h2>
		<Code code={curl} label="the request to the worker" />
	</section>

	<section class="how" aria-label="How it works">
		<h2>How it works</h2>
		<p>
			Use it for a line that must keep printing when the internet or Sedumo’s cloud is down. Every worker answers the
			same routes on the PC it runs on: <code>POST /print</code>, <code>GET /print-jobs/{'{id}'}</code>,
			<code>GET /printers</code>, <code>GET /workers</code> and <code>GET /documents</code>, with the same answers. Only
			that worker’s printers are there.
		</p>
		<h3>Cloud first, then the worker</h3>
		<Code code={node} label="the code" />
		<ul class="small">
			<li>
				Each worker keeps its own <code>Idempotency-Key</code>s, apart from the cloud’s: a print sent to both prints
				twice. So only a request that never reached the cloud (the connection refused, the name not found) goes to the
				worker. After a timeout, try the cloud again with the same key. An answer from the cloud, even a refusal, is
				final.
			</li>
			<li>What the worker printed offline appears in Sedumo’s history once it’s online again.</li>
			<li>There’s no preview on the worker, and no reading a label’s fields: read those while online and keep them.</li>
			<li>A worker’s local API has no limit on calls. Ten wrong tokens from one address lock it for 15 minutes.</li>
		</ul>
		<p><a href="/guides/api#8-print-when-the-internet-is-down">API guide: 8. Print when the internet is down</a></p>
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
