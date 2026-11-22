<script lang="ts">
	import type { PrintRequest } from '#lib/print-request.ts';
	// The label as it will print, drawn by Sedumo from the request the page shows, 400 ms after the last change. A label
	// that doesn't fit the printer shows Sedumo's reason.
	let { request, size }: { request: PrintRequest | null; size: { widthMm: number; heightMm: number } | null } =
		$props();

	let src = $state<string | null>(null);
	let problem = $state<string | null>(null);
	$effect(() => {
		const body = request ? JSON.stringify(request) : null;
		if (!body) return;
		let image: string | null = null;
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			try {
				const response = await fetch('/examples/preview', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body,
					signal: controller.signal
				});
				if (!response.ok) {
					problem = ((await response.json().catch(() => ({}))) as { message?: string }).message ?? 'No preview.';
					src = null;
					return;
				}
				image = URL.createObjectURL(await response.blob());
				src = image;
				problem = null;
			} catch {
				if (!controller.signal.aborted) problem = 'The preview couldn’t be drawn.';
			}
		}, 400);
		return () => {
			clearTimeout(timer);
			controller.abort();
			if (image) URL.revokeObjectURL(image);
		};
	});
</script>

<figure style:aspect-ratio={size ? `${size.widthMm} / ${size.heightMm}` : '3 / 2'}>
	{#if problem}
		<figcaption>{problem}</figcaption>
	{:else if src}
		<img {src} alt="The label as it will print" />
	{/if}
</figure>

<style>
	figure {
		margin: 0;
		max-height: 22rem;
		display: grid;
		place-items: center;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: #fff;
		overflow: hidden;
	}
	figcaption {
		padding: 1rem;
		text-align: center;
		color: #56605a;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		image-rendering: pixelated;
	}
</style>
