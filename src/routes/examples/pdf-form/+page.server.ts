import { loadLabelExample } from '#lib/server/label-example.ts';

export const load = ({ url }) =>
	loadLabelExample(url, { files: true, file: 'Tyre storage receipt.pdf', printer: 'PDF office printer' });
