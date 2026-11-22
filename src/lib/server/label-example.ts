import { apiUrl, hasToken, sedumo } from './env.ts';
import { SedumoError } from './sedumo.ts';

const empty = { printers: [], labels: [], files: [], printerId: null, labelId: null, fileId: null, template: null };

/** What an example starts with: a label or a file, and a printer (by name) when the URL doesn't choose. */
export type Defaults = { label?: string; file?: string; printer?: string; files?: boolean };

/**
 * What a label example shows: the printers with their state, the labels, and the chosen label's fields (GET /printers,
 * GET /documents, GET /designer/templates/:id), each time the page opens. `?printer=` and `?label=` choose; otherwise
 * the plain ZPL printer and `defaultLabel`.
 */
export async function loadLabelExample(url: URL, defaults: Defaults = {}) {
	if (!hasToken()) return { ...empty, noToken: true, problem: null, apiUrl: apiUrl() };
	try {
		return { ...(await fromSedumo(url, defaults)), noToken: false, problem: null, apiUrl: apiUrl() };
	} catch (e) {
		// Sedumo's own reason (over the plan's calls, a revoked token, maintenance), not a bare error page.
		if (e instanceof SedumoError)
			return { ...empty, noToken: false, problem: `Sedumo answered ${e.status}: ${e.reason}`, apiUrl: apiUrl() };
		throw e;
	}
}

async function fromSedumo(url: URL, defaults: Defaults) {
	const client = sedumo();
	const [printers, labels, files] = await Promise.all([
		client.listPrinters(),
		client.listLabels(),
		defaults.files ? client.listFiles() : Promise.resolve([])
	]);
	const printer =
		printers.find((p) => p.id === url.searchParams.get('printer')) ??
		printers.find((p) => p.name === (defaults.printer ?? 'ZPL 203 dpi')) ??
		printers[0] ??
		null;
	const label =
		labels.find((l) => l.id === url.searchParams.get('label')) ??
		labels.find((l) => l.name === (defaults.label ?? 'Product label.template')) ??
		labels[0] ??
		null;
	const file = files.find((f) => f.id === url.searchParams.get('file')) ?? files.find((f) => f.name === defaults.file) ?? files[0] ?? null;
	const template = label && !defaults.files ? await client.readTemplate(label.id) : null;
	return {
		printers: printers.map(({ id, name, language, dpi, status, statusReason, checkStatus, worker }) => ({
			id,
			name,
			language,
			dpi,
			status,
			statusReason,
			checkStatus,
			worker
		})),
		labels: labels.map(({ id, name, path, sha256 }) => ({ id, name: name.replace(/\.template$/i, ''), path, sha256 })),
		files: files.map(({ id, name, path, sha256 }) => ({ id, name, path, sha256 })),
		printerId: printer?.id ?? null,
		labelId: label?.id ?? null,
		fileId: file?.id ?? null,
		template
	};
}

export type LabelExample = Awaited<ReturnType<typeof loadLabelExample>>;
