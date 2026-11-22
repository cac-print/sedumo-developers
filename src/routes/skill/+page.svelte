<script lang="ts">
	import Code from '#lib/components/Code.svelte';
	import { guideHref } from '#lib/paths.ts';
	let { data } = $props();

	const unix = (folder: string) => `curl -fsSL https://developers.sedumo.com/skills/sedumo.zip -o /tmp/sedumo.zip \\
  && mkdir -p ${folder} && unzip -o /tmp/sedumo.zip -d ${folder}`;
	const windows = (folder: string) => `Invoke-WebRequest https://developers.sedumo.com/skills/sedumo.zip -OutFile $env:TEMP\\sedumo.zip
Expand-Archive $env:TEMP\\sedumo.zip -DestinationPath ${folder} -Force`;

	// Where each assistant looks for skills, from its own documentation.
	const WHERE: [string, string, string][] = [
		['Claude Code', '~/.claude/skills', '.claude/skills'],
		['OpenAI Codex', '~/.agents/skills', '.agents/skills'],
		['Cursor', '~/.agents/skills', '.agents/skills'],
		['Gemini CLI', '~/.agents/skills', '.agents/skills'],
		['GitHub Copilot (CLI, VS Code)', '~/.agents/skills', '.github/skills'],
		['Google Antigravity', '~/.gemini/config/skills', '.agents/skills']
	];
</script>

<svelte:head>
	<title>A skill for AI coding assistants · Sedumo for developers</title>
	<meta
		name="description"
		content="Teach your AI coding assistant how to build on Sedumo: add the Sedumo skill to Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot or Antigravity."
	/>
</svelte:head>

<main data-pagefind-body>
	<h1>A skill for AI coding assistants</h1>
	<p class="lead">
		Add the Sedumo skill to the assistant that writes code with you, and it builds your integration the way Sedumo works:
		the token on your server, one request per print, a key that makes retries safe, following a print until the printer
		has it (or why it waits or failed), and printing through the worker when the internet is down.
	</p>
	<p class="note">
		The skill only teaches the assistant how Sedumo works; it can't reach your Sedumo account. To let an assistant design
		labels and forms in your account, connect it as in <a href={guideHref(data.guidesBuilt, '/guides/ai-assistants')}
			>AI assistants</a
		>.
	</p>

	<h2>Add it</h2>
	<p>
		The skill is a folder, <code>sedumo</code>, in the open Agent Skills format. Put it where your assistant looks for
		skills: for all your projects, or in one project's folder, committed so your team has it too.
	</p>
	<div class="table">
		<table>
			<thead>
				<tr><th>Assistant</th><th>For all your projects</th><th>For one project</th></tr>
			</thead>
			<tbody>
				{#each WHERE as [name, home, project] (name)}
					<tr><td>{name}</td><td><code>{home}</code></td><td><code>{project}</code></td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<h3>Claude Code</h3>
	<p>For all your projects (macOS, Linux, WSL):</p>
	<Code code={unix('~/.claude/skills')} label="the command for Claude Code" />
	<p>On Windows, in PowerShell:</p>
	<Code code={windows('$HOME\\.claude\\skills')} label="the PowerShell command for Claude Code" />
	<p>Or only for one project, from its folder (commit <code>.claude/skills/sedumo</code> to share it with your team):</p>
	<Code code={unix('.claude/skills')} label="the command for one project in Claude Code" />

	<h3>Codex, Cursor, Gemini CLI and GitHub Copilot</h3>
	<p>All four read <code>~/.agents/skills</code>. For all your projects (macOS, Linux, WSL):</p>
	<Code code={unix('~/.agents/skills')} label="the command for Codex, Cursor, Gemini CLI and Copilot" />
	<p>On Windows, in PowerShell:</p>
	<Code code={windows('$HOME\\.agents\\skills')} label="the PowerShell command for Codex, Cursor, Gemini CLI and Copilot" />
	<p>
		Or only for one project, from its folder (for GitHub Copilot, <code>.github/skills</code> in place of
		<code>.agents/skills</code>):
	</p>
	<Code code={unix('.agents/skills')} label="the command for one project" />

	<h3>Google Antigravity</h3>
	<p>For all your projects (macOS, Linux, WSL):</p>
	<Code code={unix('~/.gemini/config/skills')} label="the command for Antigravity" />
	<p>On Windows, in PowerShell:</p>
	<Code code={windows('$HOME\\.gemini\\config\\skills')} label="the PowerShell command for Antigravity" />
	<p>For one project, use <code>.agents/skills</code> in its folder, as above.</p>

	<h3>Claude apps (claude.ai, desktop)</h3>
	<ol>
		<li>Download <a href="/skills/sedumo.zip" download>sedumo.zip</a>.</li>
		<li>In Claude, open <strong>Settings → Capabilities</strong>, and under <strong>Skills</strong> upload the file.</li>
	</ol>

	<h3>Any other assistant</h3>
	<p>
		The skill's files are <a href="/skills/sedumo/SKILL.md">SKILL.md</a> and
		<a href="/skills/sedumo/references/api.md">references/api.md</a>, also on
		<a href="https://github.com/sedumo/developers/tree/main/skills/sedumo">GitHub</a>. An assistant that doesn't read
		skills can take <code>SKILL.md</code> as its instructions.
	</p>

	<h2>Then ask</h2>
	<ul class="asks">
		<li>“Our ERP needs to print a pallet label through Sedumo when an order is packed. Add it to the shipping service.”</li>
		<li>“Make the line app print through the Sedumo worker when the cloud can’t be reached.”</li>
		<li>“Show the operator why a print failed or is waiting.”</li>
	</ul>
	<p>
		The assistant reads the skill when your work is about Sedumo. It points the assistant at the
		<a href={guideHref(data.guidesBuilt, '/guides/api')}>API guide</a> and the <a href="/examples">examples</a> for the details.
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
	.table {
		overflow-x: auto;
		margin: 1rem 0;
	}
	table {
		border-collapse: collapse;
	}
	.note {
		border-left: 3px solid var(--link);
		background: var(--sunken);
		padding: 0.5rem 0.9rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.35rem 0.75rem 0.35rem 0;
		vertical-align: top;
	}
</style>
