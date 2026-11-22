import { describe, expect, it } from 'vitest';
import { codeFor, LANGUAGES, PDF_FILE } from './code.ts';
import type { PrintRequest } from './print-request.ts';

const label: PrintRequest = {
	document: { path: 'Product label.template' },
	printerId: 'p1',
	data: { values: { lot: `L-$1 \\ O'Neil "x" \`y\` ä` } }
};
const pdf: PrintRequest = { document: { content: 'JVBERi0x', kind: 'stream', encoding: 'base64' }, printerId: 'p2', data: { values: {} } };

describe('codeFor', () => {
	it('sends to the page’s Sedumo, with its headers, in every language', () => {
		for (const { id } of LANGUAGES) {
			const code = codeFor(id, label, { apiUrl: 'https://api-test.example', headers: { 'Idempotency-Key': 'order-1' } });
			expect(code, id).toContain('https://api-test.example/print');
			expect(code, id).toContain('Idempotency-Key');
			expect(code, id).toContain('order-1');
		}
	});

	it('reads a PDF from its file instead of carrying the base64', () => {
		for (const { id } of LANGUAGES.filter((l) => l.id !== 'curl' && l.id !== 'abap')) {
			const code = codeFor(id, pdf);
			expect(code, id).toContain(PDF_FILE);
			expect(code, id).not.toContain('JVBERi0x');
		}
	});

	it('keeps the JSON exactly in C# and Go', () => {
		const csharp = /"""\n([\s\S]*?)\n"""/.exec(codeFor('csharp', label))?.[1];
		expect(JSON.parse(csharp ?? '')).toEqual(label);
		// Go: a backquote is added from a quoted string.
		const go = /const requestJSON = `([\s\S]*?)`\n\nfunc/.exec(codeFor('go', label))?.[1];
		expect(JSON.parse((go ?? '').replace(/` \+ "`" \+ `/g, '`'))).toEqual(label);
	});

	it('doubles JSON’s backslashes in Java’s text block', () => {
		expect(codeFor('java', label)).toContain(String.raw`"lot": "L-$1 \\\\ O'Neil \\"x\\" ` + '`y` ä"');
	});

	it('sends an empty set of values as an object from PHP', () => {
		expect(codeFor('php', pdf)).toContain("'values' => (object) []");
		expect(codeFor('php', { ...label, data: { values: { '0': 'a' } } })).toContain('(object) [');
	});

	it('writes characters compilers take as a line break, or refuse, as escapes', () => {
		const odd: PrintRequest = { ...label, data: { values: { lot: '\ufeffL1\u2028x' } } };
		// A shell's and PHP's quotes take them as they are.
		for (const id of ['csharp', 'java', 'python', 'node', 'go', 'abap'] as const) expect(codeFor(id, odd), id).not.toMatch(/[\u2028\ufeff]/);
		const go = /const requestJSON = `([\s\S]*?)`\n\nfunc/.exec(codeFor('go', odd))?.[1];
		expect(JSON.parse(go ?? '')).toEqual(odd);
	});

	it('leaves out what isn’t set, as JSON does', () => {
		const unset = { ...label, settings: { darkness: undefined } } as unknown as PrintRequest;
		expect(codeFor('python', unset)).not.toContain('darkness');
		expect(codeFor('php', unset)).not.toContain('darkness');
	});

	it('cuts ABAP’s long lines between whole characters, losing none', () => {
		const emoji: PrintRequest = { ...label, data: { values: { note: 'a'.repeat(85) + '😀'.repeat(30) + '\u2028' } } };
		const code = codeFor('abap', emoji);
		const body = [...code.matchAll(/^ {4}`(.*)`(?: &&|\.)$/gm)].map((m) => m[1].replace(/``/g, '`')).join('');
		expect(JSON.parse(body)).toEqual(emoji);
		expect(code).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])/);
	});

	it('keeps ABAP’s lines short and its backquotes doubled', () => {
		const long: PrintRequest = { ...label, data: { values: { note: '`'.repeat(400) } } };
		const code = codeFor('abap', long);
		expect(Math.max(...code.split('\n').map((line) => line.length))).toBeLessThanOrEqual(255);
		expect(code).toContain('``````');
	});
});
