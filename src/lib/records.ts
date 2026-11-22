// Many labels in one print: a table of records, packed either in full (`records`) or as what all records share once
// plus only what changes from one to the next (`common`, `changes`). And a series: one record and counters, counted by
// the app (Sedumo has no counters) and sent as changes, a run of equal labels as one record with copies.
export type Values = Record<string, string>;
export type Row = { values: Values; copies: number };
export type CopiedRecord = Record<string, string | number>;
export type ManyData = { records: CopiedRecord[] } | { common?: Values; changes: CopiedRecord[] };

/** A table pasted from a spreadsheet (tabs) or typed with commas: a header row of variable names, an optional `copies`. */
export function parseTable(text: string, names: string[]): { rows: Row[] } | { error: string } {
	const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
	if (lines.length < 2) return { error: 'Give a header row and at least one row of values.' };
	const separator = lines[0].includes('\t') ? '\t' : ',';
	const header = lines[0].split(separator).map((h) => h.trim());
	const unknown = header.filter((h) => h !== 'copies' && !names.includes(h));
	if (unknown.length > 0) return { error: `Not a field of this label: ${unknown.join(', ')}.` };
	const rows: Row[] = [];
	for (const [i, line] of lines.slice(1).entries()) {
		const cells = line.split(separator);
		if (cells.length > header.length) return { error: `Row ${i + 1} has more cells than the header.` };
		const values: Values = {};
		let copies = 1;
		header.forEach((name, column) => {
			const cell = (cells[column] ?? '').trim();
			if (name === 'copies') copies = cell === '' ? 1 : Number(cell);
			else values[name] = cell;
		});
		if (!Number.isInteger(copies) || copies < 1) return { error: `Row ${i + 1}: copies is a whole number from 1.` };
		rows.push({ values, copies });
	}
	return { rows };
}

const withCopies = (values: Values, copies: number): CopiedRecord => (copies > 1 ? { ...values, copies } : values);

/** The rows as Sedumo's data: each record in full, or what they share once and then only what changes. */
export function manyData(rows: Row[], changesOnly: boolean): ManyData {
	if (!changesOnly) return { records: rows.map((r) => withCopies(r.values, r.copies)) };
	const names = [...new Set(rows.flatMap((r) => Object.keys(r.values)))];
	const common: Values = {};
	for (const name of names) {
		const first = rows[0]?.values[name];
		if (first !== undefined && rows.every((r) => r.values[name] === first)) common[name] = first;
	}
	let before: Values = common;
	const changes = rows.map((row) => {
		const changed = Object.fromEntries(Object.entries(row.values).filter(([name, value]) => before[name] !== value));
		before = { ...before, ...row.values };
		return withCopies(changed, row.copies);
	});
	return Object.keys(common).length > 0 ? { common, changes } : { changes };
}

/** `from`, then `step` more every `every` labels, padded with zeros to `width` digits. */
export type Counter = { name: string; from: number; step: number; every: number; width: number };

export function counterValue(counter: Counter, label: number): string {
	const value = counter.from + counter.step * Math.floor(label / Math.max(1, counter.every));
	return String(value).padStart(counter.width, '0');
}

/** `count` labels of one record with counters, as rows: labels in a row that come out the same are one row with copies. */
export function seriesRows(values: Values, count: number, counters: Counter[]): Row[] {
	const rows: Row[] = [];
	let key = '';
	for (let label = 0; label < count; label++) {
		const counted = Object.fromEntries(counters.map((c) => [c.name, counterValue(c, label)]));
		const next = JSON.stringify(counted);
		if (rows.length > 0 && next === key) rows[rows.length - 1].copies++;
		else rows.push({ values: { ...values, ...counted }, copies: 1 });
		key = next;
	}
	return rows;
}

/** An example table from the label's example values: three records, the last number counting up, the second twice. */
export function exampleTable(names: string[], examples: Values): string {
	if (names.length === 0) return '';
	const counting = names.find((name) => /\d$/.test(examples[name] ?? ''));
	const rows = [0, 1, 2].map((n) => {
		const cells = names.map((name) => {
			const example = examples[name] ?? '';
			return name === counting ? countUp(example, n) : example;
		});
		return [...cells, n === 1 ? '2' : ''].join('\t');
	});
	return [[...names, 'copies'].join('\t'), ...rows].join('\n');
}

/** The last number in a value, counted up by n, keeping its width ("L0007" → "L0008"). */
export function countUp(value: string, n: number): string {
	const match = /^(.*?)(\d+)$/.exec(value);
	if (!match) return value;
	return `${match[1]}${String(Number(match[2]) + n).padStart(match[2].length, '0')}`;
}

export const labelCount = (rows: Row[]) => rows.reduce((sum, row) => sum + row.copies, 0);
