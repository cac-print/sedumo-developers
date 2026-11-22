import { describe, expect, it } from 'vitest';
import { cleanRequest, curlFor } from './print-request.ts';

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
		expect(request.data.copies).toBe(3);
		expect(request.onBehalfOf).toEqual({ id: 'a1', name: 'Ana Novak' });
		expect(request.settings).toEqual({ darkness: 25 });
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
