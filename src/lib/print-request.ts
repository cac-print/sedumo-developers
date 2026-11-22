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

/** The request without what isn't set: no empty settings, copies only above one. */
export function cleanRequest(request: PrintRequest): PrintRequest {
	const { copies, values } = request.data;
	const settings = Object.fromEntries(
		Object.entries(request.settings ?? {}).filter(([, value]) => value !== undefined && !Number.isNaN(value))
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
export function curlFor(request: PrintRequest, path = '/print'): string {
	const body = JSON.stringify(request, null, 2).replace(/'/g, `'\\''`);
	return [
		`curl ${API_URL}${path} \\`,
		`  -H "Authorization: Bearer $SEDUMO_TOKEN" \\`,
		`  -H "Content-Type: application/json" \\`,
		`  -d '${body}'`
	].join('\n');
}
