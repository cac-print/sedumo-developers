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
	// Tabs from a spreadsheet, else commas (with "quoted" cells); a header of one column takes each whole line.
	const separator = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : null;
	// One column: the whole line is the cell, without the quotes round it.
	const split = (line: string) =>
		separator === '\t' ? line.split('\t') : separator ? splitCsv(line) : [splitCsv(line).join(',')];
	const header = split(lines[0]).map((h) => h.trim());
	const unknown = header.filter((h) => h !== 'copies' && !names.includes(h));
	if (unknown.length > 0) return { error: `Not a field of this label: ${unknown.join(', ')}.` };
	const rows: Row[] = [];
	if (unclosed(lines[0])) return { error: 'The header has a quote that isn’t closed.' };
	for (const [i, line] of lines.slice(1).entries()) {
		if (separator !== '\t' && unclosed(line)) return { error: `Row ${i + 1}: a quote isn’t closed.` };
		const cells = split(line);
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

/** Whether a line ends inside a quoted cell. */
function unclosed(line: string): boolean {
	let quoted = false;
	let cellStart = true;
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (quoted) {
			if (c === '"' && line[i + 1] === '"') i++;
			else if (c === '"') quoted = false;
		} else if (c === '"' && cellStart) quoted = true;
		else if (c === ',') cellStart = true;
		else if (c.trim()) cellStart = false;
	}
	return quoted;
}

/** A line of comma-separated cells; a cell in double quotes may hold commas, and "" is a quote. */
function splitCsv(line: string): string[] {
	const cells: string[] = [];
	let cell = '';
	let quoted = false;
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (quoted) {
			if (c === '"' && line[i + 1] === '"') (cell += '"'), i++;
			else if (c === '"') quoted = false;
			else cell += c;
		} else if (c === '"' && cell.trim() === '') (cell = ''), (quoted = true);
		else if (c === ',') cells.push(cell), (cell = '');
		else cell += c;
	}
	cells.push(cell);
	return cells;
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
	// The zeros go after a minus sign: -1 with 4 digits is -0001.
	return (value < 0 ? '-' : '') + String(Math.abs(value)).padStart(counter.width, '0');
}

/**
 * `count` labels of one record with counters, as rows: labels in a row that come out the same are one row with copies,
 * at most `maxCopies` a row.
 */
export function seriesRows(values: Values, count: number, counters: Counter[], maxCopies = Infinity): Row[] {
	const rows: Row[] = [];
	let key = '';
	for (let label = 0; label < count; label++) {
		const counted = Object.fromEntries(counters.map((c) => [c.name, counterValue(c, label)]));
		const next = JSON.stringify(counted);
		if (rows.length > 0 && next === key && rows[rows.length - 1].copies < maxCopies) rows[rows.length - 1].copies++;
		else rows.push({ values: { ...values, ...counted }, copies: 1 });
		key = next;
	}
	return rows;
}

/** The field an example table counts up: a serial, lot or batch, else one ending in a number that isn't a barcode
 * number (8 to 14 digits, with a check digit) or a decimal such as a weight. */
export function countingField(names: string[], examples: Values): string | undefined {
	const endsInNumber = (name: string) => /\d$/.test(examples[name] ?? '');
	const counts = (name: string) => {
		const example = examples[name] ?? '';
		return endsInNumber(name) && !/^\d{8,14}$/.test(example) && !/^\d+[.,]\d+$/.test(example);
	};
	// A serial, lot or batch counts whatever its digits (a date lot such as 20261015 too).
	for (const preferred of ['serial', 'lot', 'batch']) {
		const name = names.find((n) => n.toLowerCase() === preferred && endsInNumber(n));
		if (name) return name;
	}
	return names.find(counts);
}

/** An example table from the label's example values: three records, one field counting up, the second twice. */
export function exampleTable(names: string[], examples: Values): string {
	if (names.length === 0) return '';
	const counting = countingField(names, examples);
	const rows = [0, 1, 2].map((n) => {
		const cells = names.map((name) => {
			const example = examples[name] ?? '';
			const value = name === counting ? countUp(example, n) : example;
			const flat = value.replace(/\s*\n\s*/g, ' ');
			return /[",\t]/.test(flat) ? `"${flat.replace(/"/g, '""')}"` : flat;
		});
		return [...cells, n === 1 ? '2' : ''].join(',');
	});
	return [[...names, 'copies'].join(','), ...rows].join('\n');
}

/** The last number in a value, counted up by n, keeping its width ("L0007" → "L0008"). */
export function countUp(value: string, n: number): string {
	const match = /^(.*?)(\d+)$/.exec(value);
	if (!match) return value;
	return `${match[1]}${String(Number(match[2]) + n).padStart(match[2].length, '0')}`;
}

export const labelCount = (rows: Row[]) => rows.reduce((sum, row) => sum + row.copies, 0);
