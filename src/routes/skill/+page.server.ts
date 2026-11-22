import { hasGuides } from '#lib/guides.ts';

// Whether this build has the guides: without them, the link goes to developers.sedumo.com's.
export const load = () => ({ guidesBuilt: hasGuides() });
