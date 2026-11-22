import { loadLabelExample } from '#lib/server/label-example.ts';

export const load = ({ url }) => loadLabelExample(url, { labels: false, printer: 'PDF office printer' });
