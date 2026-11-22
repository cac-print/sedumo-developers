import { GUIDES, hasGuides } from '#lib/guides.ts';

export const load = () => ({ guides: GUIDES, built: hasGuides() });
