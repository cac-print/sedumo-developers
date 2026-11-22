<script lang="ts">
	// A print's status until it is printed or failed: every second for a minute, then every 5 seconds, for 3 minutes.
	type Status = { status?: string; waiting?: { reason?: string } | null; error?: string | null };
	let { jobId, onstatus }: { jobId: string; onstatus?: (status: unknown) => void } = $props();

	let current = $state<Status | null>(null);
	let gaveUp = $state(false);
	$effect(() => {
		const id = jobId;
		current = null;
		gaveUp = false;
		const started = Date.now();
		let timer: ReturnType<typeof setTimeout>;
		let stopped = false;
		async function ask() {
			const response = await fetch(`/examples/jobs/${encodeURIComponent(id)}`).catch(() => null);
			if (stopped) return;
			const body = response?.ok ? ((await response.json().catch(() => null)) as Status | null) : null;
			if (stopped) return;
			if (body) {
				current = body;
				onstatus?.(body);
				if (body.status === 'completed' || body.status === 'failed') return;
			}
			const age = Date.now() - started;
			if (age > 180_000) return (gaveUp = true);
			timer = setTimeout(ask, age > 60_000 ? 5000 : 1000);
		}
		ask();
		return () => {
			stopped = true;
			clearTimeout(timer);
		};
	});

	const detail = (s: Status) =>
		(s.waiting?.reason ? `, waiting: ${s.waiting.reason.replace(/_/g, ' ')}` : '') + (s.error ? `: ${s.error}` : '');
	const words: Record<string, string> = {
		queued: 'Queued: waiting for the worker',
		processing: 'Processing: the worker has it',
		completed: 'Printed',
		failed: 'Failed'
	};
</script>

<p class="status {current?.status ?? 'queued'}" role="status">
	{#if !current}Asking Sedumo…{:else}<strong>{words[current.status ?? ''] ?? current.status}</strong>{detail(current)}{/if}{#if gaveUp}
		(still waiting; this page stopped asking){/if}
</p>

<style>
	.status {
		margin: 0;
		padding: 0.6rem 0.8rem;
		border-radius: 8px;
		background: var(--sunken);
		border-left: 4px solid var(--line);
	}
	.completed {
		border-left-color: var(--sedumo-green);
	}
	.failed {
		border-left-color: var(--sedumo-coral);
	}
	.processing {
		border-left-color: var(--sedumo-amber);
	}
</style>
