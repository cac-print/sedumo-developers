import { apiUrl, hasToken, sedumo } from '#lib/server/env.ts';
import { SedumoError } from '#lib/server/sedumo.ts';

// The printers with their state, the labels, and the chosen label's fields (GET /printers, GET /documents,
// GET /designer/templates/:id), each time the page opens: printers change state, and labels get new versions.
const empty = { printers: [], labels: [], printerId: null, labelId: null, template: null };

export const load = async ({ url }) => {
	if (!hasToken()) return { ...empty, noToken: true, problem: null, apiUrl: apiUrl() };
	try {
		return { ...(await loadSedumo(url)), noToken: false, problem: null, apiUrl: apiUrl() };
	} catch (e) {
		// Sedumo's own reason (over the plan's calls, a revoked token, maintenance), not a bare error page.
		if (e instanceof SedumoError) return { ...empty, noToken: false, problem: `Sedumo answered ${e.status}: ${e.reason}`, apiUrl: apiUrl() };
		throw e;
	}
};

async function loadSedumo(url: URL) {
	const client = sedumo();
	const [printers, labels] = await Promise.all([client.listPrinters(), client.listLabels()]);
	const printer =
		printers.find((p) => p.id === url.searchParams.get('printer')) ??
		printers.find((p) => p.name === 'ZPL 203 dpi') ??
		printers[0] ??
		null;
	const label =
		labels.find((l) => l.id === url.searchParams.get('label')) ??
		labels.find((l) => l.name === 'Product label.template') ??
		labels[0] ??
		null;
	const template = label ? await client.readTemplate(label.id) : null;
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
		printerId: printer?.id ?? null,
		labelId: label?.id ?? null,
		template
	};
}
