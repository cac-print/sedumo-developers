import { error } from '@sveltejs/kit';
import { GUIDES, hasGuides, loadGuide } from '#lib/guides.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

// A page for each guide the build has. Built without the manual, there are none to build ahead, and the server
// answers 404.
export const prerender = hasGuides();

export const entries: EntryGenerator = () => (hasGuides() ? GUIDES.map((g) => ({ slug: g.slug })) : []);

export const load: PageServerLoad = ({ params }) => {
	const guide = loadGuide(params.slug);
	if (!guide) error(404, 'No such guide');
	return { ...guide, guides: GUIDES };
};
