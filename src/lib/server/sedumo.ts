// Every call this site makes to Sedumo, from its own server with an API token: the token never reaches the browser
// (Sedumo's API takes calls from servers, not browsers). A developer copies this file with the example they need.
import type { PrintRequest } from '#lib/print-request.ts';

export type Printer = {
	id: string;
	name: string;
	language: string | null;
	dpi: number;
	status: 'ready' | 'error' | 'offline' | 'unknown';
	statusReason: string | null;
	checkStatus: boolean;
	worker: { id: string; name: string; status: string } | null;
};

export type DocumentSummary = { id: string; name: string; path: string; sha256: string; contentType: string };

export type Variable = {
	name: string;
	example?: string;
	caption?: string;
	input?: 'text' | 'number' | 'date' | 'choice';
	choices?: string[];
	required?: boolean;
	help?: string;
};

export type Template = { name: string; size: { widthMm: number; heightMm: number }; variables: Variable[] };

/** Sedumo's answer as it came: the status and the JSON, to show what an app gets back; `replayed` when Sedumo
 * answered a retry with the first answer (`Idempotent-Replayed: true`). */
export type Answer = { status: number; body: unknown; replayed?: boolean };

export class SedumoError extends Error {
	constructor(
		readonly status: number,
		readonly body: unknown,
		// Sedumo's own words, to show a person.
		readonly reason: string
	) {
		super(`Sedumo ${status}: ${reason}`);
	}
}

export function sedumoClient(apiUrl: string, token: string, fetchImpl: typeof fetch = fetch) {
	if (!token) throw new Error('SEDUMO_TOKEN is not set');
	const base = apiUrl.replace(/\/+$/, '');

	async function send(method: 'GET' | 'POST', path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Response> {
		const response = await fetchImpl(`${base}${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${token}`,
				...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
				...headers
			},
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		if (!response.ok) {
			const text = await response.text().catch(() => '');
			let parsed: unknown = text;
			try {
				parsed = JSON.parse(text);
			} catch {
				// not JSON: keep the text
			}
			const message = (parsed as { message?: unknown })?.message;
			throw new SedumoError(response.status, parsed, typeof message === 'string' ? message : text.slice(0, 300));
		}
		return response;
	}

	const call = async <T>(method: 'GET' | 'POST', path: string, body?: unknown) =>
		(await (await send(method, path, body)).json()) as T;

	return {
		listPrinters: () => call<Printer[]>('GET', '/printers'),
		/** The labels: documents whose name ends with .template (Sedumo finds names that contain the text). */
		listLabels: async () =>
			(await call<DocumentSummary[]>('GET', `/documents?q=${encodeURIComponent('.template')}`))
				.filter((d) => d.name.toLowerCase().endsWith('.template'))
				.sort((a, b) => a.path.localeCompare(b.path)),
		/** The files that print as they are: ZPL and PDF files (.zpl, .prn, .txt, .pdf). */
		listFiles: async () =>
			(await call<DocumentSummary[]>('GET', '/documents'))
				.filter((d) => /\.(zpl|prn|txt|pdf)$/i.test(d.name))
				.sort((a, b) => a.path.localeCompare(b.path)),
		readTemplate: async (id: string) =>
			(await call<{ template: Template }>('GET', `/designer/templates/${encodeURIComponent(id)}`)).template,
		/**
		 * The one print action: a document, a printer and data. Refusals come back as an answer, not an error. With an
		 * idempotency key, the same request sent again within 24 hours gets the first answer and prints nothing more.
		 */
		print: async (request: PrintRequest, idempotencyKey?: string): Promise<Answer> => {
			try {
				const response = await send('POST', '/print', request, idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {});
				const replayed = response.headers.get('Idempotent-Replayed') === 'true';
				return { status: response.status, body: await response.json(), ...(replayed ? { replayed } : {}) };
			} catch (error) {
				if (error instanceof SedumoError && error.status < 500) return { status: error.status, body: error.body };
				throw error;
			}
		},
		/** The label as it would print, as a PNG: the same body as a print, nothing printed. */
		preview: async (request: PrintRequest) => (await send('POST', '/print/preview', request)).arrayBuffer(),
		job: (jobId: string) => call<unknown>('GET', `/print-jobs/${encodeURIComponent(jobId)}`)
	};
}

export type SedumoClient = ReturnType<typeof sedumoClient>;
