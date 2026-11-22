import { describe, expect, it } from 'vitest';
import { countUp, exampleTable, manyData, parseTable, seriesRows } from './records.ts';

describe('parseTable', () => {
	it('reads a spreadsheet’s tabs or commas, with copies', () => {
		expect(parseTable('lot\tcopies\nA\t2\nB\t', ['lot'])).toEqual({ rows: [{ values: { lot: 'A' }, copies: 2 }, { values: { lot: 'B' }, copies: 1 }] });
		expect(parseTable('lot,qty\nA,1', ['lot', 'qty'])).toEqual({ rows: [{ values: { lot: 'A', qty: '1' }, copies: 1 }] });
	});
	it('says what’s wrong', () => {
		expect(parseTable('lot', ['lot'])).toHaveProperty('error');
		expect(parseTable('nope\nA', ['lot'])).toEqual({ error: 'Not a field of this label: nope.' });
		expect(parseTable('lot,copies\nA,x', ['lot'])).toHaveProperty('error');
	});
});

describe('manyData', () => {
	const rows = [
		{ values: { product: 'Milk', lot: 'L1' }, copies: 1 },
		{ values: { product: 'Milk', lot: 'L2' }, copies: 2 }
	];
	it('sends every record in full', () => {
		expect(manyData(rows, false)).toEqual({ records: [{ product: 'Milk', lot: 'L1' }, { product: 'Milk', lot: 'L2', copies: 2 }] });
	});
	it('or what they share once, then only what changes', () => {
		expect(manyData(rows, true)).toEqual({ common: { product: 'Milk' }, changes: [{ lot: 'L1' }, { lot: 'L2', copies: 2 }] });
	});
});

describe('seriesRows', () => {
	it('makes equal labels in a row one record with copies', () => {
		const rows = seriesRows({ lot: 'L' }, 10, [
			{ name: 'a', from: 1, step: 1, every: 3, width: 0 },
			{ name: 'b', from: 1, step: 1, every: 5, width: 0 }
		]);
		expect(rows.map((r) => r.copies)).toEqual([3, 2, 1, 3, 1]);
	});
	it('pads a counter with zeros', () => {
		expect(seriesRows({}, 2, [{ name: 'serial', from: 1, step: 1, every: 1, width: 4 }]).map((r) => r.values.serial)).toEqual(['0001', '0002']);
	});
});

describe('examples', () => {
	it('counts the last number up, keeping its width', () => {
		expect(countUp('L0007', 1)).toBe('L0008');
		expect(countUp('Milk', 2)).toBe('Milk');
	});
	it('makes a three-record table with copies', () => {
		const table = exampleTable(['product', 'serial'], { product: 'Milk', serial: '0001' }).split('\n');
		expect(table[0]).toBe('product\tserial\tcopies');
		expect(table[2]).toBe('Milk\t0002\t2');
	});
});
