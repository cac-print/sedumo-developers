import { loadLabelExample } from '#lib/server/label-example.ts';

export const load = ({ url }) => loadLabelExample(url, 'Pallet label.template');
