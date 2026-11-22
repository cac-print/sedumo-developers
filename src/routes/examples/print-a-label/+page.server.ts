import { hasToken, sedumo } from '#lib/server/env.ts';

// The printers with their state, the labels, and the chosen label's fields (GET /printers, GET /documents,
// GET /designer/templates/:id), each time the page opens: printers change state, and labels get new versions.
export const load = async ({ url }) => {
	if (!hasToken()) return { noToken: true, printers: [], labels: [], printerId: null, labelId: null, template: null };
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
		template,
		noToken: false
	};
};
