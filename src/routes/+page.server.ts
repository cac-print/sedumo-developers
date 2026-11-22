import { hasGuides } from '#lib/guides.ts';

// Whether this build has the guides: without them, the Start page links to developers.sedumo.com's.
export const load = () => ({ guidesBuilt: hasGuides() });
