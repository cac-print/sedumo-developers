// Runs the code the examples show, in every language that runs on its own (not ABAP, X++, AL or VBA). First against
// a local server that checks each program sends exactly the page's request: the same JSON, the token, the headers.
// Then, with SEDUMO_TOKEN, against Sedumo, where each print must be queued (201): the token needs print and
// printers:read, on an account with the sample labels (`npm run setup`) and the printers "ZPL 203 dpi" and
// "PDF office printer"; SEDUMO_API_URL for another Sedumo.
//
//   node scripts/run-code.ts [language…]            with each language's own tools installed
//   node scripts/run-code.ts --docker [language…]   with each language's official Docker image instead
import { execFile } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual, promisify } from 'node:util';
import type { AddressInfo } from 'node:net';
import { codeFor, LANGUAGES, PDF_FILE, type Language } from '../src/lib/code.ts';
import type { PrintRequest } from '../src/lib/print-request.ts';

const args = process.argv.slice(2);
const docker = args.includes('--docker');
const chosen = args.filter((a) => !a.startsWith('--'));
const apiUrl = (process.env.SEDUMO_API_URL ?? 'https://api.sedumo.com').replace(/\/+$/, '');
const token = process.env.SEDUMO_TOKEN;

// How each program runs: its file, the command, and the Docker image for --docker.
type How = { file: string; command: string[]; image: string; project?: { file: string; text: string } };
const RUN: Partial<Record<Language, How>> = {
	python: { file: 'print.py', command: ['python3', 'print.py'], image: 'python:3.13-slim' },
	node: { file: 'print.mjs', command: ['node', 'print.mjs'], image: 'node:24-slim' },
	php: { file: 'print.php', command: ['php', 'print.php'], image: 'php:8.4-cli' },
	java: { file: 'Print.java', command: ['java', 'Print.java'], image: 'eclipse-temurin:21-jdk' },
	go: { file: 'main.go', command: ['go', 'run', 'main.go'], image: 'golang:1.25' },
	csharp: {
		file: 'Program.cs',
		// A console project around Program.cs, as `dotnet new console` makes it.
		project: {
			file: 'print.csproj',
			text: `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup></Project>`
		},
		command: ['dotnet', 'run'],
		image: 'mcr.microsoft.com/dotnet/sdk:8.0'
	},
	vbnet: {
		file: 'Program.vb',
		// As `dotnet new console -lang VB` makes it.
		project: {
			file: 'print.vbproj',
			text: `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><RootNamespace>print</RootNamespace><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>`
		},
		command: ['dotnet', 'run'],
		image: 'mcr.microsoft.com/dotnet/sdk:8.0'
	},
	ruby: { file: 'print.rb', command: ['ruby', 'print.rb'], image: 'ruby:3.3-slim' },
	// The .NET SDK's image has PowerShell 7.
	powershell: { file: 'print.ps1', command: ['pwsh', '-NoProfile', '-File', 'print.ps1'], image: 'mcr.microsoft.com/dotnet/sdk:8.0' }
};

// The printers to print to: Sedumo's own ids, or made up for the local check.
let printers: { id: string; name: string }[] = [];
if (token) {
	const response = await fetch(`${apiUrl}/printers`, { headers: { Authorization: `Bearer ${token}` } });
	if (!response.ok) throw new Error(`/printers: ${response.status} ${await response.text()}`);
	const answer = await response.json();
	printers = Array.isArray(answer) ? answer : (answer.printers ?? answer.data);
	if (!Array.isArray(printers)) throw new Error(`/printers: no list of printers in ${JSON.stringify(answer).slice(0, 200)}`);
}
function printer(name: string): string {
	if (!token) return `printer ${name}`;
	const id = printers.find((p) => p.name === name)?.id;
	if (!id) throw new Error(`No printer "${name}"`);
	return id;
}

const run = Date.now().toString(36);
const pdfFile = 'setup/files/packing-list.pdf';
// Every kind of request a page makes, with text that needs escaping in some language: quotes, $, \, a backquote, ä,
// curly quotes, Ruby's #{, a byte-order mark (pasted from a spreadsheet) and a line separator.
type Case = { name: string; request: PrintRequest; headers?: Record<string, string>; pdf?: string };
const CASES: Case[] = [
	{
		name: 'a label, a retry key, who prints',
		request: {
			document: { path: 'Product label.template' },
			printerId: printer('ZPL 203 dpi'),
			data: { values: { product: 'Butter 250 g', weight: '0.250', best_before: '2026-12-31', lot: `\ufeffL-$1 \\ O'Neil "x" \`y\` ä č „P“ “q” #{x} #@a\u2028`, ean: '3830001234567' } },
			onBehalfOf: { id: 'code-check', name: 'Code check' }
		},
		headers: { 'Idempotency-Key': `code-check-${run}` }
	},
	{
		name: 'many labels, what changes',
		request: {
			document: { path: 'Product label.template' },
			printerId: printer('ZPL 203 dpi'),
			data: {
				common: { product: 'Butter 250 g', weight: '0.250', best_before: '2027-01-15', ean: '3830001234574' },
				changes: [{ lot: 'A1' }, { lot: 'A2', copies: 2 }]
			}
		}
	},
	{
		name: 'your own ZPL',
		request: {
			document: { content: '^XA\n^FO50,50^A0N,40,40^FDCode check `ok` $1^FS\n^XZ\n', kind: 'stream', encoding: 'text' },
			printerId: printer('ZPL 203 dpi'),
			data: { values: {} }
		}
	},
	{
		name: 'a PDF you made',
		request: { document: { content: 'read from the file', kind: 'stream', encoding: 'base64' }, printerId: printer('PDF office printer'), data: { values: {} } },
		pdf: pdfFile
	}
];

// The local check: what a program must send, and the answer it gets.
const LOCAL_TOKEN = 'local-check-token';
let expected: { body: unknown; headers: Record<string, string> } = { body: null, headers: {} };
const server = createServer((req, res) => {
	let raw = '';
	req.on('data', (chunk) => (raw += chunk));
	req.on('end', () => {
		const problems = [];
		if (req.method !== 'POST' || req.url !== '/print') problems.push(`${req.method} ${req.url}`);
		if (req.headers.authorization !== `Bearer ${LOCAL_TOKEN}`) problems.push(`Authorization ${req.headers.authorization}`);
		if (!/^application\/json\b/.test(req.headers['content-type'] ?? '')) problems.push(`Content-Type ${req.headers['content-type']}`);
		for (const [name, value] of Object.entries(expected.headers)) {
			if (req.headers[name.toLowerCase()] !== value) problems.push(`${name} ${req.headers[name.toLowerCase()]}`);
		}
		let body;
		try {
			body = JSON.parse(raw);
		} catch {
			problems.push(`not JSON: ${raw.slice(0, 200)}`);
		}
		if (body !== undefined && !isDeepStrictEqual(body, expected.body)) problems.push(`body ${JSON.stringify(body)}`);
		res.writeHead(problems.length ? 400 : 201, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(problems.length ? { message: problems.join('; ') } : { jobId: 'local-check' }));
	});
});
// In Docker, a program reaches this machine as host.docker.internal.
await new Promise<void>((resolve) => server.listen(0, docker ? '0.0.0.0' : '127.0.0.1', () => resolve()));
const localUrl = `http://${docker ? 'host.docker.internal' : '127.0.0.1'}:${(server.address() as AddressInfo).port}`;

async function runProgram(language: Language, code: string, c: Case, environmentToken: string) {
	const how = RUN[language] as How;
	const dir = mkdtempSync(join(tmpdir(), `sedumo-code-${language}-`));
	try {
		writeFileSync(join(dir, how.file), code);
		if (how.project) writeFileSync(join(dir, how.project.file), how.project.text);
		if (c.pdf) copyFileSync(c.pdf, join(dir, PDF_FILE));
		const env = { ...process.env, SEDUMO_TOKEN: environmentToken };
		const command = docker
			? // As root (the .NET SDK's first run needs it), giving what a build leaves back to this user.
				['docker', 'run', '--rm', '--add-host', 'host.docker.internal:host-gateway', '-e', 'SEDUMO_TOKEN', '-e', 'DOTNET_CLI_TELEMETRY_OPTOUT=1', '-e', 'DOTNET_NOLOGO=1', '-v', `${dir}:/code`, '-w', '/code', how.image, 'sh', '-c', `${how.command.join(' ')}; s=$?; chown -R ${process.getuid?.()}:${process.getgid?.()} /code; exit $s`]
			: how.command;
		const { stdout } = await promisify(execFile)(command[0], command.slice(1), { cwd: dir, env, encoding: 'utf8', maxBuffer: 10_000_000, timeout: 300_000 });
		// The program prints the status, then the answer.
		return { ok: /^201\b/m.test(stdout), output: stdout.trim() };
	} catch (error) {
		const e = error as { stderr?: string; message: string };
		return { ok: false, output: String(e.stderr || e.message).trim().split('\n').slice(-5).join(' | ') };
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

const unknown = chosen.filter((name) => !(name in RUN));
if (unknown.length) throw new Error(`Not a language this runs: ${unknown.join(', ')} (it runs ${Object.keys(RUN).join(', ')})`);
const languages = LANGUAGES.map((l) => l.id).filter((id) => id in RUN && (!chosen.length || chosen.includes(id)));
const failed: string[] = [];
for (const language of languages) {
	for (const [i, c] of CASES.entries()) {
		// Each language its own key: the same key with another program's body may be refused.
		const headers = Object.fromEntries(Object.entries(c.headers ?? {}).map(([k, v]) => [k, `${v}-${language}`]));
		const body = c.pdf ? { ...c.request, document: { ...c.request.document, content: readFileSync(c.pdf).toString('base64') } } : c.request;
		const targets = [{ where: 'local', url: localUrl, token: LOCAL_TOKEN }, ...(token ? [{ where: 'Sedumo', url: apiUrl, token }] : [])];
		for (const target of targets) {
			expected = { body, headers };
			const { ok, output } = await runProgram(language, codeFor(language, c.request, { apiUrl: target.url, headers }), c, target.token);
			const what = `${language.padEnd(10)} ${target.where.padEnd(6)} ${i + 1}. ${c.name}`;
			console.log(ok ? `ok   ${what}` : `FAIL ${what}: ${output.replace(/\s+/g, ' ').slice(0, 500)}`);
			if (!ok) failed.push(what);
			if (!ok) break;
		}
	}
}
server.close();
if (failed.length) {
	console.error(`\n${failed.length} failed`);
	process.exit(1);
}
