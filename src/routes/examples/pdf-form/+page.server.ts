import { loadLabelExample } from '#lib/server/label-example.ts';

export const load = ({ url }) =>
	loadLabelExample(url, { labels: false, files: true, fileStrict: true, file: 'Tyre storage receipt.pdf', printer: 'PDF office printer' });
