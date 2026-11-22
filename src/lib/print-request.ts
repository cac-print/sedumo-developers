// What an app sends to print, and the same request as a curl command. The examples build the request in the browser
// to show it as it changes, and the server sends exactly that (`src/lib/server/sedumo.ts`).
import type { ManyData } from './records.ts';

export type DocumentRef = { id: string } | { path: string } | { sha256: string };

export type PrintSettings = { darkness?: number; speedMmS?: number };

/** One record (`values`, `copies`), every record in full (`records`), or what they share and what changes. */
export type PrintData = { values: Record<string, string>; copies?: number } | ManyData;

export type PrintRequest = {
	document: DocumentRef;
	printerId: string;
	data: PrintData;
	onBehalfOf?: { id: string; name: string };
	settings?: PrintSettings;
};

export const API_URL = 'https://api.sedumo.com';

// What this site lets anyone send to the demo printers: a few labels and short values.
export const LIMITS = { copies: 10, labels: 50, records: 50, values: 50, valueLength: 500, idLength: 300 };

const isText = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;

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
	if (!r || typeof r !== 'object' || !r.document || typeof r.printerId !== 'string') return 'Not a print request';
	const ref = Object.values(r.document);
	if (ref.length !== 1 || !isText(ref[0], LIMITS.idLength)) return 'Name one document';
	if (r.printerId.length > LIMITS.idLength) return 'Not a printer id';
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
	if (labels > LIMITS.labels) return `At most ${LIMITS.labels} labels a print on the demo printers`;
	return null;
}

/** The request without what isn't set: no empty settings, one record's copies only above one. */
export function cleanRequest(request: PrintRequest): PrintRequest {
	const data = request.data;
	const settings = Object.fromEntries(
		// An emptied number field is null in the browser: left out, as it isn't set.
		Object.entries(request.settings ?? {}).filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
	);
	return {
		document: request.document,
		printerId: request.printerId,
		data: cleanData(data),
		...(request.onBehalfOf?.name ? { onBehalfOf: request.onBehalfOf } : {}),
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
	const body = JSON.stringify(request, null, 2).replace(/'/g, `'\\''`);
	return [
		`curl ${apiUrl}${path} \\`,
		`  -H "Authorization: Bearer $SEDUMO_TOKEN" \\`,
		`  -H "Content-Type: application/json" \\`,
		`  -d '${body}'`
	].join('\n');
}
