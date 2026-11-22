<script lang="ts">
	import Code from '#lib/components/Code.svelte';

	const claudeCode = `curl -fsSL https://developers.sedumo.com/skills/sedumo.zip -o /tmp/sedumo.zip \\
  && unzip -o /tmp/sedumo.zip -d ~/.claude/skills/`;
	const project = `curl -fsSL https://developers.sedumo.com/skills/sedumo.zip -o /tmp/sedumo.zip \\
  && unzip -o /tmp/sedumo.zip -d .claude/skills/`;
</script>

<svelte:head>
	<title>A skill for Claude · Sedumo for developers</title>
	<meta name="description" content="Teach Claude how to build on Sedumo: add the Sedumo skill to Claude Code or the Claude apps." />
</svelte:head>

<main data-pagefind-body>
	<h1>A skill for Claude</h1>
	<p class="lead">
		Add the Sedumo skill to Claude, and it builds your integration the way Sedumo works: the token on your server, one
		request per print, a key that makes retries safe, following a print until it’s on paper, and printing through the
		worker when the internet is down.
	</p>

	<h2>Add it</h2>
	<h3>Claude Code</h3>
	<p>For all your projects:</p>
	<Code code={claudeCode} label="the command" />
	<p>Or only for one project, from its folder (commit <code>.claude/skills/sedumo</code> to share it with your team):</p>
	<Code code={project} label="the command" />

	<h3>Claude apps (claude.ai, desktop)</h3>
	<ol>
		<li>Download <a href="/skills/sedumo.zip" download>sedumo.zip</a>.</li>
		<li>In Claude, open <strong>Settings → Capabilities</strong>, and under <strong>Skills</strong> upload the file.</li>
	</ol>

	<h3>Anything else that reads Agent Skills</h3>
	<p>
		The skill is a folder: <a href="/skills/sedumo/SKILL.md">SKILL.md</a> and
		<a href="/skills/sedumo/references/api.md">references/api.md</a>, also on
		<a href="https://github.com/sedumo/developers/tree/main/skills/sedumo">GitHub</a>.
	</p>

	<h2>Then ask</h2>
	<ul class="asks">
		<li>“Our ERP needs to print a pallet label through Sedumo when an order is packed. Add it to the shipping service.”</li>
		<li>“Make the line app print through the Sedumo worker when the cloud can’t be reached.”</li>
		<li>“Show the operator why a print failed or is waiting.”</li>
	</ul>
	<p>
		Claude reads the skill when your work is about Sedumo. It points Claude at the
		<a href="/guides/api">API guide</a> and the <a href="/examples">examples</a> for the details.
	</p>
</main>

<style>
	main {
		max-width: 48rem;
		margin: 0 auto;
		padding: 2.5rem 1rem 0;
	}
	h3 {
		margin-top: 1.5rem;
	}
	.asks li {
		margin: 0.4rem 0;
	}
</style>
