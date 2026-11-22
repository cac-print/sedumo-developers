<script lang="ts">
	import type { Snippet } from 'svelte';
	import Code from './Code.svelte';
	import RequestCode from './RequestCode.svelte';
	import { curlFor, type PrintRequest } from '#lib/print-request.ts';
	import { codeFor, onlyIn, type Language } from '#lib/code.ts';

	// The right column of an example: when to use it, the request in the reader's language, Sedumo's answer, and
	// following the print.
	let {
		request,
		answer,
		lastStatus,
		apiUrl,
		guides,
		intro,
		notes,
		headers = {},
		path = '/print',
		codeTabs = true,
		only
	}: {
		request: PrintRequest | null;
		answer: { status: number; body: { jobId?: string } & Record<string, unknown>; replayed?: boolean } | null;
		lastStatus: unknown;
		apiUrl: string;
		guides: { href: string; text: string }[];
		intro: Snippet;
		notes?: Snippet;
		headers?: Record<string, string>;
		// The route with its query, e.g. `/print?successStatus=200`.
		path?: string;
		// The request in every language; false when another system sends it (Dynamics 365): curl only, as it's sent.
		codeTabs?: boolean;
		// One language only, no tabs: the page is about it (AL on the Business Central page).
		only?: Language;
	} = $props();
	// Queued: 201, or 200 when asked for.
	const jobId = $derived(answer && answer.status >= 200 && answer.status < 300 ? answer.body.jobId : undefined);
</script>

<h2>How it works</h2>
{@render intro()}

<h3>The request</h3>
{#if request}
	{#if only}
		<Code code={codeFor(only, request, { apiUrl, headers, path, alReport: only === 'al' })} label="the code" />
		{#if onlyIn(only)}<p class="small">For {onlyIn(only)}. Not run in our checks: it runs only inside {onlyIn(only)}.</p>{/if}
	{:else if codeTabs}<RequestCode {request} {apiUrl} {headers} {path} />
	{:else}<Code code={curlFor(request, path, apiUrl, headers)} label="the request" />{/if}
{/if}
{#if notes}<div class="small">{@render notes()}</div>{/if}

<h3>What comes back</h3>
{#if answer}
	<Code
		code={`HTTP ${answer.status}${answer.replayed ? '\nIdempotent-Replayed: true' : ''}\n${JSON.stringify(answer.body, null, 2)}`}
		label="the answer"
	/>
{:else}
	<p class="small">Press Print: Sedumo answers as soon as the print is queued, with its <code>jobId</code>.</p>
{/if}

{#if jobId}
	<h3>Follow it</h3>
	<Code
		code={`curl ${apiUrl}/print-jobs/${jobId} \\\n  -H "Authorization: Bearer $SEDUMO_TOKEN"${lastStatus ? `\n\n${JSON.stringify(lastStatus, null, 2)}` : ''}`}
		label="the status request"
	/>
{/if}

<p class="guides">
	{#each guides as guide, i (guide.href)}{#if i > 0}{' · '}{/if}<a href={guide.href}>{guide.text}</a>{/each}
</p>

<style>
	h2 {
		margin-top: 0;
	}
	h3 {
		margin-top: 1.5rem;
	}
	.small {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.small :global(p) {
		margin: 0.5rem 0 0;
	}
	.guides {
		margin-top: 1.5rem;
	}
</style>
