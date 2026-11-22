import { fail, redirect } from '@sveltejs/kit';
import { ACCOUNT_COOKIE, ACCOUNT_COOKIE_MAX_AGE, tokenProblem } from '#lib/account.ts';
import { sedumoWith, usingOwnAccount } from '#lib/server/env.ts';
import { SedumoError } from '#lib/server/sedumo.ts';

// Who reads this page differs per browser, so it's never built ahead.
export const prerender = false;

/** Where to go back to after choosing: an example page this site has, else the examples. */
const back = (url: URL) => {
	const from = url.searchParams.get('from') ?? '';
	return /^\/examples(\/[a-z-]+)?$/.test(from) ? from : '/examples';
};

export const load = ({ url }) => ({ ownAccount: usingOwnAccount(), back: back(url) });

export const actions = {
	// Checks the token with the calls the examples make first (GET /printers, GET /documents), then keeps it in a cookie
	// the page's scripts can't read. Sent only to Sedumo, never stored or logged here.
	use: async ({ request, cookies, url }) => {
		const token = String((await request.formData()).get('token') ?? '').trim();
		const problem = tokenProblem(token);
		if (problem) return fail(400, { problem });
		try {
			const client = sedumoWith(token);
			await client.listPrinters();
			await client.listLabels();
		} catch (e) {
			if (e instanceof SedumoError && e.status === 401)
				return fail(400, { problem: 'Sedumo doesn’t take this token: it has expired, was revoked, or was copied only in part.' });
			if (e instanceof SedumoError && e.status === 403)
				return fail(400, { problem: `Sedumo refused: ${e.reason}. Give the token List printers and Read documents.` });
			if (e instanceof SedumoError) return fail(400, { problem: `Sedumo answered ${e.status}: ${e.reason}` });
			return fail(503, { problem: 'Sedumo couldn’t be reached. Try again in a minute.' });
		}
		cookies.set(ACCOUNT_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'strict', maxAge: ACCOUNT_COOKIE_MAX_AGE });
		redirect(303, back(url));
	},
	// Back to the demo: the cookie goes. The token itself still works until it expires; revoke it in Sedumo.
	stop: async ({ cookies, url }) => {
		cookies.delete(ACCOUNT_COOKIE, { path: '/' });
		redirect(303, back(url));
	}
};
