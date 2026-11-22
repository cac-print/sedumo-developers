<script lang="ts">
	import Preview from './Preview.svelte';
	import PrintStatus from './PrintStatus.svelte';
	import { isIdempotencyKey, requestProblem, type PrintRequest } from '#lib/print-request.ts';

	type Answer = { status: number; body: { jobId?: string; message?: unknown } & Record<string, unknown>; replayed?: boolean };
	// The preview, Print, and what happened: Sedumo's refusal with its reason, or the print's status until it's done.
	let {
		request,
		size,
		answer = $bindable(null),
		lastStatus = $bindable(null),
		preview = true,
		idempotencyKey,
		successStatus
	}: {
		request: PrintRequest | null;
		size: { widthMm: number; heightMm: number } | null;
		answer?: Answer | null;
		lastStatus?: unknown;
		// Sedumo previews labels designed in it; a file prints as it is.
		preview?: boolean;
		// Sent as the Idempotency-Key header: then Print can send the same request again.
		idempotencyKey?: string;
		// `?successStatus=200`, as Dynamics 365 sends it: a queued print answered with 200.
		successStatus?: 200;
	} = $props();

	// Past the demo's limits, or a key that can't be sent: said here, and neither previewed nor sent.
	const problem = $derived(
		request
			? (requestProblem(request) ??
					(idempotencyKey !== undefined && !isIdempotencyKey(idempotencyKey)
						? 'An Idempotency-Key is 1 to 200 visible characters, no spaces (letters, digits and signs)'
						: null))
			: null
	);
	const sendable = $derived(problem ? null : request);

	let sending = $state(false);
	async function print() {
		if (!sendable) return;
		sending = true;
		answer = null;
		lastStatus = null;
		try {
			const response = await fetch(successStatus ? `/examples/print?successStatus=${successStatus}` : '/examples/print', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', ...(idempotencyKey !== undefined ? { 'Idempotency-Key': idempotencyKey } : {}) },
				body: JSON.stringify(sendable)
			});
			answer = await response.json().then(
				(body) => (response.ok ? body : { status: response.status, body }),
				() => ({ status: response.status, body: { message: 'This site couldn’t send it.' } })
			);
		} catch {
			answer = { status: 0, body: { message: 'This site couldn’t reach its server. It may or may not have printed.' } };
		} finally {
			sending = false;
		}
	}
	// Queued: 201, or 200 when asked for.
	const jobId = $derived(answer && answer.status >= 200 && answer.status < 300 ? answer.body.jobId : undefined);
</script>

{#if problem}<p class="refused" role="alert">{problem}</p>{/if}
{#if preview}<Preview request={sendable} {size} />{/if}

<button class="print" type="button" disabled={!sendable || sending} onclick={print}>{sending ? 'Sending…' : 'Print'}</button>

{#if answer && answer.status !== 201}
	<p class="refused" role="alert"><strong>Refused ({answer.status})</strong>: {String(answer.body.message ?? 'see the answer')}</p>
{/if}
{#if answer?.replayed}
	<p class="replayed" role="status">Sedumo answered with the first answer (<code>Idempotent-Replayed: true</code>): nothing more printed.</p>
{/if}
{#if jobId}
	<PrintStatus {jobId} onstatus={(s) => (lastStatus = s)} />
{/if}
<p class="note">Demo printers: everyone prints to the same ones, so don’t enter real data.</p>

<style>
	.print {
		font: 600 1rem var(--body);
		padding: 0.65rem 1.2rem;
		border: 0;
		border-radius: 8px;
		background: var(--sedumo-green);
		color: #fff;
		cursor: pointer;
		justify-self: start;
	}
	.print:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.refused {
		margin: 0;
		padding: 0.6rem 0.8rem;
		border-radius: 8px;
		background: var(--sunken);
		border-left: 4px solid var(--sedumo-coral);
	}
	.replayed {
		margin: 0;
		padding: 0.6rem 0.8rem;
		border-radius: 8px;
		background: var(--sunken);
		border-left: 4px solid var(--sedumo-leaf);
	}
	.note {
		color: var(--muted);
		font-size: 0.9rem;
		margin: 0;
	}
</style>
