import { describe, expect, it } from 'vitest';
import { countingField, countUp, exampleTable, manyData, parseTable, seriesRows } from './records.ts';

describe('parseTable', () => {
	it('reads a spreadsheet’s tabs or commas, with copies', () => {
		expect(parseTable('lot\tcopies\nA\t2\nB\t', ['lot'])).toEqual({ rows: [{ values: { lot: 'A' }, copies: 2 }, { values: { lot: 'B' }, copies: 1 }] });
		expect(parseTable('lot,qty\nA,1', ['lot', 'qty'])).toEqual({ rows: [{ values: { lot: 'A', qty: '1' }, copies: 1 }] });
	});
	it('takes each whole line when the header has one column', () => {
		expect(parseTable('product\nMilk 1 l, 12 x 1 l', ['product'])).toEqual({ rows: [{ values: { product: 'Milk 1 l, 12 x 1 l' }, copies: 1 }] });
	});
	it('takes the quotes off a one-column CSV', () => {
		expect(parseTable('"product"\n"Milk, 1 l"', ['product'])).toEqual({ rows: [{ values: { product: 'Milk, 1 l' }, copies: 1 }] });
	});
	it('says when a quote isn’t closed', () => {
		expect(parseTable('product,lot\n"Milk, 1 l,L1', ['product', 'lot'])).toEqual({ error: 'Row 1: a quote isn’t closed.' });
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
	it('starts a new record after the most copies a record may have', () => {
		expect(seriesRows({ lot: 'L' }, 25, [], 10).map((r) => r.copies)).toEqual([10, 10, 5]);
	});
	it('puts the zeros after a minus sign', () => {
		expect(seriesRows({}, 3, [{ name: 'n', from: 1, step: -1, every: 1, width: 4 }]).map((r) => r.values.n)).toEqual(['0001', '0000', '-0001']);
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
	it('makes a three-record table with copies, quoting a value with a comma', () => {
		const table = exampleTable(['product', 'serial'], { product: 'Milk 1 l, 12 x 1 l', serial: '0001' }).split('\n');
		expect(table[0]).toBe('product,serial,copies');
		expect(table[2]).toBe('"Milk 1 l, 12 x 1 l",0002,2');
		expect(parseTable(table.join('\n'), ['product', 'serial'])).toEqual({
			rows: [
				{ values: { product: 'Milk 1 l, 12 x 1 l', serial: '0001' }, copies: 1 },
				{ values: { product: 'Milk 1 l, 12 x 1 l', serial: '0002' }, copies: 2 },
				{ values: { product: 'Milk 1 l, 12 x 1 l', serial: '0003' }, copies: 1 }
			]
		});
	});
	it('counts a serial or lot, never a barcode number or a weight', () => {
		const pallet = { product: 'Milk', gtin: '03830000000017', lot: 'L2026-10', qty: '48', serial: '0001' };
		expect(countingField(Object.keys(pallet), pallet)).toBe('serial');
		const product = { product: 'Milk', weight: '1.030', best_before: '2026-12-10', lot: 'L2026-10', ean: '3830000000017' };
		expect(countingField(Object.keys(product), product)).toBe('lot');
		const dated = { product: 'Milk', lot: '20261015', qty: '48' };
		expect(countingField(Object.keys(dated), dated)).toBe('lot');
	});
});
