import { SEDUMO_API_URL, SEDUMO_TOKEN } from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { ACCOUNT_COOKIE, tokenProblem } from '#lib/account.ts';
import { sedumoClient } from './sedumo.ts';

// The demo's token is a secret of the server (SEDUMO_TOKEN), never in the code or the browser. A developer who pasted
// their own on /account sends it in a cookie with each request: then that one is used, for this request only.
export const apiUrl = () => SEDUMO_API_URL.replace(/\/+$/, '');

/** The developer's own token from this request's cookie, when there is one that looks right. */
export function ownToken(): string | null {
	const value = getRequestEvent().cookies.get(ACCOUNT_COOKIE);
	return value && !tokenProblem(value) ? value : null;
}

export const usingOwnAccount = () => ownToken() !== null;
export const hasToken = () => usingOwnAccount() || !!SEDUMO_TOKEN;

export function sedumo() {
	return sedumoClient(SEDUMO_API_URL, ownToken() ?? SEDUMO_TOKEN ?? '');
}

/** A client with a token the developer has just pasted, to check it before it's kept. */
export function sedumoWith(token: string) {
	return sedumoClient(SEDUMO_API_URL, token);
}
