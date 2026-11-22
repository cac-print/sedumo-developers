<script lang="ts">
	import type { Snippet } from 'svelte';
	import Code from './Code.svelte';
	import { curlFor, type PrintRequest } from '#lib/print-request.ts';

	// The right column of an example: when to use it, the request as curl, Sedumo's answer, and following the print.
	let {
		request,
		answer,
		lastStatus,
		apiUrl,
		guides,
		intro,
		notes,
		headers = {}
	}: {
		request: PrintRequest | null;
		answer: { status: number; body: { jobId?: string } & Record<string, unknown>; replayed?: boolean } | null;
		lastStatus: unknown;
		apiUrl: string;
		guides: { href: string; text: string }[];
		intro: Snippet;
		notes?: Snippet;
		headers?: Record<string, string>;
	} = $props();
	const jobId = $derived(answer?.status === 201 ? answer.body.jobId : undefined);
</script>

<h2>How it works</h2>
{@render intro()}

<h3>The request</h3>
{#if request}<Code code={curlFor(request, '/print', apiUrl, headers)} label="the request" />{/if}
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
