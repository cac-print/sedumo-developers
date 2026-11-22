import { usingOwnAccount } from '#lib/server/env.ts';

// Whether the examples print on the developer's own account (a token pasted on /account) or on the demo. Read on every
// page (it uses `url`), so it's right after /account changes it, and no example page is built ahead with "the demo".
export const load = ({ url }) => {
	void url.pathname;
	return { ownAccount: usingOwnAccount() };
};
