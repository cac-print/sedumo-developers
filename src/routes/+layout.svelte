<script lang="ts">
	import '#lib/brand/tokens.css';
	import '#lib/styles/site.css';
	import '@fontsource/bricolage-grotesque/latin-700.css';
	import { page } from '$app/state';
	import wordmark from '#lib/brand/sedumo-wordmark-white.svg';
	let { children } = $props();

	const sections = [
		{ href: '/', title: 'Start' },
		{ href: '/guides', title: 'Guides' },
		{ href: '/search', title: 'Search' }
	];
	const here = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
</script>

<a class="skip" href="#content">Skip to content</a>
<header>
	<div class="bar">
		<a class="brand" href="/" aria-label="Sedumo for developers, start">
			<img src={wordmark} alt="Sedumo" width="112" height="25" />
			<span>Developers</span>
		</a>
		<nav aria-label="Sections">
			{#each sections as s (s.href)}
				<a href={s.href} aria-current={here(s.href) ? 'page' : undefined}>{s.title}</a>
			{/each}
		</nav>
		<nav class="out" aria-label="Elsewhere">
			<a href="https://status.sedumo.com">Status</a>
			<a href="https://github.com/sedumo/developers">GitHub</a>
			<a class="signin" href="https://app.sedumo.com">Sign in</a>
		</nav>
	</div>
</header>

<div id="content">
	{@render children()}
</div>

<footer>
	<div class="bar">
		<span>Sedumo for developers</span>
		<a href="https://sedumo.com">sedumo.com</a>
		<a href="https://status.sedumo.com">Status</a>
		<a href="https://github.com/sedumo/developers">This site’s code (MIT)</a>
	</div>
</footer>

<style>
	.skip {
		position: absolute;
		left: -999px;
	}
	.skip:focus {
		left: 1rem;
		top: 0.5rem;
		z-index: 2;
		background: var(--paper);
		padding: 0.25rem 0.5rem;
	}
	header {
		background: var(--ground);
		color: var(--on-ground);
	}
	.bar {
		max-width: 76rem;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 1.5rem;
	}
	header .bar {
		min-height: 3.75rem;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--on-ground);
		text-decoration: none;
		padding: 0.6rem 0;
	}
	.brand img {
		display: block;
		height: 25px;
		width: auto;
	}
	.brand span {
		font: 700 1.05rem var(--display);
		color: var(--on-ground-muted);
		border-left: 1px solid rgba(243, 246, 242, 0.3);
		padding-left: 0.6rem;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	nav a {
		color: var(--on-ground-muted);
		text-decoration: none;
		padding: 0.4rem 0.6rem;
		border-radius: 6px;
		font-size: 0.95rem;
	}
	nav a:hover {
		color: var(--on-ground);
		background: var(--ground-deep);
	}
	nav a[aria-current='page'] {
		color: var(--on-ground);
		box-shadow: inset 0 -2px 0 var(--on-ground);
		border-radius: 0;
	}
	.out {
		margin-left: auto;
	}
	.signin {
		border: 1px solid rgba(243, 246, 242, 0.4);
	}
	header :focus-visible {
		outline-color: var(--on-ground);
	}
	footer {
		border-top: 1px solid var(--line);
		margin-top: 4rem;
		color: var(--muted);
		font-size: 0.9rem;
	}
	footer .bar {
		padding-block: 1.5rem;
		gap: 0.5rem 1.5rem;
	}
	@media (max-width: 40rem) {
		.out {
			margin-left: 0;
		}
	}
</style>
