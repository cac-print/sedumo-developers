// What an app sends to print, and the same request as a curl command. The examples build the request in the browser
// to show it as it changes, and the server sends exactly that (`src/lib/server/sedumo.ts`).

export type DocumentRef = { id: string } | { path: string } | { sha256: string };

export type PrintSettings = { darkness?: number; speedMmS?: number };

export type PrintRequest = {
	document: DocumentRef;
	printerId: string;
	data: { values: Record<string, string>; copies?: number };
	onBehalfOf?: { id: string; name: string };
	settings?: PrintSettings;
};

export const API_URL = 'https://api.sedumo.com';

// What this site lets anyone send to the demo printers: a few copies and short values.
export const LIMITS = { copies: 10, values: 50, valueLength: 500, idLength: 300 };

/** Why a request from the browser isn't sent, or null. The page keeps to these; the server checks them again. */
export function requestProblem(body: unknown): string | null {
	const r = body as Partial<PrintRequest> | null;
	if (!r || typeof r !== 'object' || !r.document || typeof r.printerId !== 'string') return 'Not a print request';
	const ref = Object.values(r.document);
	if (ref.length !== 1 || typeof ref[0] !== 'string' || ref[0].length > LIMITS.idLength) return 'Name one document';
	if (r.printerId.length > LIMITS.idLength) return 'Not a printer id';
	const values = r.data?.values;
	if (!values || typeof values !== 'object') return 'No values';
	const entries = Object.entries(values);
	if (entries.length > LIMITS.values) return `At most ${LIMITS.values} values`;
	if (entries.some(([, v]) => typeof v !== 'string' || v.length > LIMITS.valueLength))
		return `Values are text of at most ${LIMITS.valueLength} characters`;
	const copies = r.data?.copies;
	if (copies !== undefined && (!Number.isInteger(copies) || copies < 1 || copies > LIMITS.copies))
		return `1 to ${LIMITS.copies} copies on the demo printers`;
	return null;
}

/** The request without what isn't set: no empty settings, copies only above one. */
export function cleanRequest(request: PrintRequest): PrintRequest {
	const { copies, values } = request.data;
	const settings = Object.fromEntries(
		// An emptied number field is null in the browser: left out, as it isn't set.
		Object.entries(request.settings ?? {}).filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
	);
	return {
		document: request.document,
		printerId: request.printerId,
		data: copies && copies > 1 ? { values, copies } : { values },
		...(request.onBehalfOf?.name ? { onBehalfOf: request.onBehalfOf } : {}),
		...(Object.keys(settings).length ? { settings } : {})
	};
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
