import { describe, expect, it } from 'vitest';
import { cleanRequest, curlFor, fileLabels, requestProblem, type PrintRequest } from './print-request.ts';

const base = { document: { path: 'Product label.template' }, printerId: 'p1', data: { values: { lot: 'L1' } } };

describe('cleanRequest', () => {
	it('leaves out what isn’t set', () => {
		expect(cleanRequest({ ...base, data: { values: { lot: 'L1' }, copies: 1 }, onBehalfOf: { id: 'a', name: '' }, settings: {} })).toEqual(base);
	});
	it('keeps copies above one, who prints and the settings given', () => {
		const request = cleanRequest({
			...base,
			data: { values: { lot: 'L1' }, copies: 3 },
			onBehalfOf: { id: 'a1', name: 'Ana Novak' },
			settings: { darkness: 25, speedMmS: undefined }
		});
		expect((request.data as { copies?: number }).copies).toBe(3);
		expect(request.onBehalfOf).toEqual({ id: 'a1', name: 'Ana Novak' });
		expect(request.settings).toEqual({ darkness: 25 });
	});
});

describe('cleanRequest, emptied fields', () => {
	it('leaves out a setting whose field was emptied (null)', () => {
		const settings = { darkness: null, speedMmS: 51 } as unknown as { darkness?: number; speedMmS?: number };
		expect(cleanRequest({ ...base, settings }).settings).toEqual({ speedMmS: 51 });
	});
});

describe('requestProblem', () => {
	it('lets a normal request through', () => {
		expect(requestProblem({ ...base, data: { values: { lot: 'L1' }, copies: 2 } })).toBeNull();
	});
	it('stops too many copies, long values and odd shapes', () => {
		expect(requestProblem({ ...base, data: { values: {}, copies: 100000 } })).toMatch(/copies/);
		expect(requestProblem({ ...base, data: { values: { a: 'x'.repeat(501) } } })).toMatch(/characters/);
		expect(requestProblem({ ...base, document: { id: 'a', path: 'b' } })).toMatch(/one document/);
		expect(requestProblem('x')).toMatch(/Not a print request/);
	});
	it('takes only Sedumo’s data shapes, and values as a set of values', () => {
		expect(requestProblem({ ...base, data: { records: [{ lot: 'A' }], changes: [{ lot: 'B' }] } })).toMatch(/data is/);
		expect(requestProblem({ ...base, data: { values: {}, extra: 1 } })).toMatch(/data is/);
		expect(requestProblem({ ...base, data: { values: null } })).toBe('No values');
		expect(requestProblem({ ...base, data: { values: 'abc' } })).toBe('No values');
	});
	it('sends on only the checked parts of the data', () => {
		const sneaky = { ...base, data: { common: { lot: 'L' }, changes: [{ serial: '1' }], extra: 'x' } } as unknown as PrintRequest;
		expect(cleanRequest(sneaky).data).toEqual({ common: { lot: 'L' }, changes: [{ serial: '1' }] });
	});
	it('reads a value named copies as a value, not as the copies', () => {
		expect(requestProblem({ ...base, data: { values: { copies: 'abc', lot: 'L' } } })).toBeNull();
	});
	it('counts the labels of every record against the demo’s limit', () => {
		const records = Array.from({ length: 6 }, () => ({ lot: 'L', copies: 10 }));
		expect(requestProblem({ ...base, data: { records } })).toMatch(/50 labels/);
		expect(requestProblem({ ...base, data: { common: { lot: 'L' }, changes: [{ serial: '1' }, { serial: '2', copies: 3 }] } })).toBeNull();
	});
});

describe('curlFor', () => {
	it('is a curl command with the token from the environment and the JSON body', () => {
		const curl = curlFor(base);
		expect(curl).toContain('curl https://api.sedumo.com/print');
		expect(curl).toContain('Bearer $SEDUMO_TOKEN');
		expect(curl).toContain('"path": "Product label.template"');
	});
	it('escapes a single quote in a value for the shell', () => {
		expect(curlFor({ ...base, data: { values: { name: "O'Brien" } } })).toContain(`O'\\''Brien`);
	});
});

describe('files sent with the request', () => {
	const xml = (q: string, labels = 1) =>
		`<labels _FORMAT="Product label" _PRINTERNAME="ZPL 203 dpi"${q}>${'<label><variable name="a">b</variable></label>'.repeat(labels)}</labels>`;
	it('counts an Oracle XML’s labels with their quantities', () => {
		expect(fileLabels(xml(' _QUANTITY="3"', 2), 'oracle_xml')).toEqual({ labels: 6 });
		expect(fileLabels(xml(' _QUANTITY="5000"'), 'oracle_xml')).toHaveProperty('problem');
		expect(requestProblem({ document: { content: xml(' _QUANTITY="10"', 6), kind: 'oracle_xml' } })).toMatch(/50 labels/);
		expect(requestProblem({ document: { content: xml(''), kind: 'oracle_xml' } })).toBeNull();
	});
	it('counts a ZPL file’s labels with ^PQ, times the records', () => {
		expect(fileLabels('^XA^FDa^FS^PQ3^XZ^XA^FDb^FS^XZ', 'stream')).toEqual({ labels: 4 });
		expect(fileLabels('^XA^PQ9999^XZ', 'stream')).toHaveProperty('problem');
		const zpl = { content: '^XA^FD{{a}}^FS^PQ10^XZ', kind: 'stream' as const };
		expect(requestProblem({ document: zpl, printerId: 'p', data: { values: { a: 'x' }, copies: 6 } })).toMatch(/50 labels/);
	});
	it('takes who prints and the settings only as the page sends them', () => {
		expect(requestProblem({ ...base, onBehalfOf: { id: 'a', name: 'x'.repeat(201) } })).toMatch(/Who prints/);
		expect(requestProblem({ ...base, settings: { anything: 5 } as never })).toMatch(/settings/);
		const sent = cleanRequest({ ...base, onBehalfOf: { id: 'a', name: 'Ana', extra: 1 } as never, settings: { darkness: 20, other: 3 } as never });
		expect(sent.onBehalfOf).toEqual({ id: 'a', name: 'Ana' });
		expect(sent.settings).toEqual({ darkness: 20 });
	});
	it('shortens only a base64 file in the curl', () => {
		expect(curlFor({ document: { content: 'x'.repeat(700), kind: 'stream' }, printerId: 'p' })).toContain('x'.repeat(700));
		expect(curlFor({ document: { content: 'A'.repeat(700), kind: 'stream', encoding: 'base64' }, printerId: 'p' })).toContain('<base64 of the file');
	});
});
