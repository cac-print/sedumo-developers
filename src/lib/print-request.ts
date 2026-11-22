// What an app sends to print, and the same request as a curl command. The examples build the request in the browser
// to show it as it changes, and the server sends exactly that (`src/lib/server/sedumo.ts`).
import type { ManyData } from './records.ts';

export type DocumentRef =
	| { id: string }
	| { path: string }
	| { sha256: string }
	// A file sent with the request: printer commands (ZPL) as text, a PDF as base64, or an Oracle WMS XML.
	| { content: string; kind: 'stream' | 'oracle_xml'; encoding?: 'text' | 'base64' };

export type PrintSettings = { darkness?: number; speedMmS?: number };

/** One record (`values`, `copies`), every record in full (`records`), or what they share and what changes. */
export type PrintData = { values: Record<string, string>; copies?: number } | ManyData;

export type PrintRequest = {
	document: DocumentRef;
	// Left out for an Oracle XML, which names its printer.
	printerId?: string;
	data?: PrintData;
	onBehalfOf?: { id: string; name: string };
	settings?: PrintSettings;
};

export const API_URL = 'https://api.sedumo.com';

// What this site lets anyone send to the demo printers: a few labels and short values.
export const LIMITS = { copies: 10, labels: 50, records: 50, values: 50, valueLength: 500, idLength: 300, content: 1_500_000 };

const isText = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;

/**
 * How many labels a file in the request asks for, as far as the demo's limits go: an Oracle XML's <label>s each with
 * its _QUANTITY (or the document's), a ZPL file's labels (^XA…^XZ) each with its ^PQ quantity. A problem, or the count.
 */
export function fileLabels(content: string, kind: 'stream' | 'oracle_xml'): { labels: number } | { problem: string } {
	const quantities = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].map((m) => Number(m[1]));
	if (kind === 'oracle_xml') {
		const root = /<labels\b([^>]*)>/i.exec(content)?.[1] ?? '';
		const whole = quantities(root, /_QUANTITY\s*=\s*"(\d+)"/gi)[0] ?? 1;
		const labels = [...content.matchAll(/<label\b([^>]*)>/gi)].map((m) => quantities(m[1], /_QUANTITY\s*=\s*"(\d+)"/gi)[0] ?? whole);
		if (labels.length > LIMITS.records) return { problem: `At most ${LIMITS.records} labels in an XML on the demo` };
		if ([whole, ...labels].some((q) => q > LIMITS.copies)) return { problem: `_QUANTITY 1 to ${LIMITS.copies} on the demo printers` };
		const values = [...content.matchAll(/<variable\b[^>]*>([^<]*)<\/variable>/gi)].map((m) => m[1]);
		if (values.some((v) => v.length > LIMITS.valueLength)) return { problem: `Values of at most ${LIMITS.valueLength} characters` };
		return { labels: labels.reduce((sum, q) => sum + q, 0) };
	}
	// ZPL: each label with its ^PQ quantity (1 without one).
	const blocks = content.split(/\^XA/i).slice(1);
	const each = blocks.map((block) => quantities(block, /\^PQ\s*(\d+)/gi)[0] ?? 1);
	if (each.some((q) => q > LIMITS.copies)) return { problem: `^PQ 1 to ${LIMITS.copies} on the demo printers` };
	return { labels: Math.max(1, each.reduce((sum, q) => sum + q, 0)) };
}

function recordProblem(record: unknown, copiesAllowed: boolean): string | null {
	if (!record || typeof record !== 'object' || Array.isArray(record)) return 'A record is a set of values';
	const entries = Object.entries(record).filter(([name]) => !(copiesAllowed && name === 'copies'));
	if (entries.length > LIMITS.values) return `At most ${LIMITS.values} values a record`;
	if (entries.some(([, v]) => !isText(v, LIMITS.valueLength)))
		return `Values are text of at most ${LIMITS.valueLength} characters`;
	return null;
}

/** Why a request from the browser isn't sent, or null. The page keeps to these; the server checks them again. */
export function requestProblem(body: unknown): string | null {
	const r = body as Partial<PrintRequest> | null;
	if (!r || typeof r !== 'object' || !r.document || typeof r.document !== 'object') return 'Not a print request';
	const document = r.document as Record<string, unknown>;
	const documentKeys = Object.keys(document).sort().join(',');
	const xml = document.kind === 'oracle_xml';
	if ('content' in document) {
		if (!['content,kind', 'content,encoding,kind'].includes(documentKeys)) return 'A file is content, kind and encoding';
		if (!isText(document.content, LIMITS.content) || !(document.content as string).length)
			return `A file of at most ${Math.round(LIMITS.content / 1000)} KB on the demo`;
		if (document.kind !== 'stream' && !xml) return 'A file’s kind is stream or oracle_xml';
		if (document.encoding !== undefined && document.encoding !== 'text' && document.encoding !== 'base64')
			return 'A file’s encoding is text or base64';
	} else {
		const ref = Object.values(document);
		if (ref.length !== 1 || !['id', 'path', 'sha256'].includes(documentKeys) || !isText(ref[0], LIMITS.idLength))
			return 'Name one document';
	}
	// A file's own labels count against the demo's limits (a PDF's pages don't: its size is the limit).
	const fromFile =
		'content' in document && document.encoding !== 'base64' ? fileLabels(document.content as string, xml ? 'oracle_xml' : 'stream') : { labels: 1 };
	if ('problem' in fromFile) return fromFile.problem;
	const who = r.onBehalfOf as unknown;
	if (who !== undefined) {
		const w = who as Record<string, unknown>;
		if (!w || typeof w !== 'object' || !isText(w.id, 200) || !isText(w.name, 200)) return 'Who prints: an id and a name of at most 200 characters';
	}
	const settings = r.settings as Record<string, unknown> | undefined;
	if (settings !== undefined && (typeof settings !== 'object' || Object.keys(settings).some((k) => k !== 'darkness' && k !== 'speedMmS')))
		return 'Print settings: darkness and speedMmS';
	if (xml) {
		// An Oracle XML carries its printer and values.
		if (r.printerId !== undefined && !isText(r.printerId, LIMITS.idLength)) return 'Not a printer id';
		if (fromFile.labels > LIMITS.labels) return `At most ${LIMITS.labels} labels a print on the demo printers`;
		return r.data === undefined ? null : 'An Oracle XML carries its own values';
	}
	if (!isText(r.printerId, LIMITS.idLength) || !r.printerId) return 'Choose a printer';
	const data = (r.data ?? null) as Record<string, unknown> | null;
	if (!data || typeof data !== 'object' || Array.isArray(data)) return 'No data';
	// One of Sedumo's three shapes, and nothing else.
	const keys = Object.keys(data).sort().join(',');
	if (!['values', 'copies,values', 'records', 'changes', 'changes,common'].includes(keys))
		return 'The data is values (and copies), records, or common and changes';
	const isObject = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v);
	if ('values' in data && !isObject(data.values)) return 'No values';
	const many = data.records ?? data.changes;
	if (!('values' in data) && !Array.isArray(many)) return 'Records are a list';
	// One record's copies are its own key, never a value named "copies".
	const records: unknown[] = 'values' in data ? [{ ...(data.values as object), copies: data.copies }] : (many as unknown[]);
	if (records.length === 0) return 'No values';
	if (records.length > LIMITS.records) return `At most ${LIMITS.records} records on the demo printers`;
	if (data.common !== undefined) {
		const problem = recordProblem(data.common, false);
		if (problem) return problem;
	}
	let labels = 0;
	for (const record of records) {
		const problem = recordProblem(record, true);
		if (problem) return problem;
		const copies = (record as { copies?: unknown }).copies ?? 1;
		if (!Number.isInteger(copies) || (copies as number) < 1 || (copies as number) > LIMITS.copies)
			return `1 to ${LIMITS.copies} copies a record on the demo printers`;
		labels += copies as number;
	}
	labels *= fromFile.labels;
	if (labels > LIMITS.labels) return `At most ${LIMITS.labels} labels a print on the demo printers`;
	return null;
}

/** The request without what isn't set: no empty settings, one record's copies only above one. */
export function cleanRequest(request: PrintRequest): PrintRequest {
	const settings = Object.fromEntries(
		// An emptied number field is null in the browser: left out, as it isn't set.
		Object.entries(request.settings ?? {}).filter(
			([name, value]) => (name === 'darkness' || name === 'speedMmS') && typeof value === 'number' && Number.isFinite(value)
		)
	);
	const document = request.document;
	return {
		document:
			'content' in document
				? { content: document.content, kind: document.kind, ...(document.encoding ? { encoding: document.encoding } : {}) }
				: document,
		...(request.printerId ? { printerId: request.printerId } : {}),
		...(request.data ? { data: cleanData(request.data) } : {}),
		...(request.onBehalfOf?.name ? { onBehalfOf: { id: request.onBehalfOf.id, name: request.onBehalfOf.name } } : {}),
		...(Object.keys(settings).length ? { settings } : {})
	};
}

/** Only the parts of Sedumo's three shapes, rebuilt, so nothing else from the browser goes on. */
function cleanData(data: PrintData): PrintData {
	if ('values' in data) return data.copies && data.copies > 1 ? { values: data.values, copies: data.copies } : { values: data.values };
	if ('records' in data) return { records: data.records };
	return data.common ? { common: data.common, changes: data.changes } : { changes: data.changes };
}

/** The request as curl prints it, with the token from $SEDUMO_TOKEN. */
export function curlFor(request: PrintRequest, path = '/print', apiUrl = API_URL): string {
	// A long file (a PDF's base64) is shortened, so the command stays readable; the request sends all of it.
	const document = request.document;
	const shown =
		'content' in document && document.encoding === 'base64' && document.content.length > 600
			? { ...request, document: { ...document, content: `<base64 of the file, ${Math.round(document.content.length / 1000)} KB>` } }
			: request;
	const body = JSON.stringify(shown, null, 2).replace(/'/g, `'\\''`);
	return [
		`curl ${apiUrl}${path} \\`,
		`  -H "Authorization: Bearer $SEDUMO_TOKEN" \\`,
		`  -H "Content-Type: application/json" \\`,
		`  -d '${body}'`
	].join('\n');
}
