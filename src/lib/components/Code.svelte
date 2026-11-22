<script lang="ts">
	// A block of code with a button that copies it.
	let { code, label }: { code: string; label: string } = $props();
	let copied = $state(false);
	async function copy() {
		await navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<div class="code">
	<button type="button" onclick={copy} aria-label="Copy {label}">{copied ? 'Copied' : 'Copy'}</button>
	<pre><code>{code}</code></pre>
</div>

<style>
	.code {
		position: relative;
	}
	button {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		font: inherit;
		font-size: 0.8rem;
		padding: 0.15rem 0.5rem;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--paper);
		color: var(--ink);
		cursor: pointer;
	}
	pre {
		margin: 0;
		max-height: 28rem;
	}
</style>
