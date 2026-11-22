// "Use my account": a developer's own API token, pasted on /account, used instead of the demo's. It lives in a cookie
// the page's scripts can't read, for a day at most or until they stop; the server reads it for each request, sends it
// only to Sedumo and never stores or logs it.

/** The cookie that holds the token. */
export const ACCOUNT_COOKIE = 'sedumo_account_token';

/** A day: a token made for this site is made to expire after a day. */
export const ACCOUNT_COOKIE_MAX_AGE = 24 * 60 * 60;

/** Why this isn't an API token Sedumo makes (`sedumo_mt_…`), in words for the person who pasted it; null when it is. */
export function tokenProblem(value: string): string | null {
	const token = value.trim();
	if (!token) return 'Paste the token first.';
	if (token.startsWith('sedumo_pt_'))
		return 'That’s a personal token for an AI assistant. The examples need an API token: Settings → Access → API tokens.';
	if (!/^sedumo_mt_[A-Za-z0-9_-]{20,100}$/.test(token))
		return 'That isn’t a Sedumo API token: it starts with sedumo_mt_ and has no spaces.';
	return null;
}
