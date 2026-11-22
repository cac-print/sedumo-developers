import { usingOwnAccount } from '#lib/server/env.ts';

// Whether the examples print on the developer's own account (a token pasted on /account) or on the demo.
export const load = () => ({ ownAccount: usingOwnAccount() });
