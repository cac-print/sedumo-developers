import { error } from '@sveltejs/kit';
import { GUIDES, hasGuides, loadGuide } from '#lib/guides.ts';
import type { EntryGenerator, PageLoad } from './$types';

// A page for each guide the build has; none when it was built without the manual.
export const entries: EntryGenerator = () => (hasGuides() ? GUIDES.map((g) => ({ slug: g.slug })) : []);

export const load: PageLoad = ({ params }) => {
	const guide = loadGuide(params.slug);
	if (!guide) error(404, 'No such guide');
	return { ...guide, guides: GUIDES };
};
