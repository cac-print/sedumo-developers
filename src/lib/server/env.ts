import { SEDUMO_API_URL, SEDUMO_TOKEN } from '$app/env/private';
import { sedumoClient } from './sedumo.ts';

// The token is a secret of the server (SEDUMO_TOKEN), never in the code or the browser.
export const hasToken = () => !!SEDUMO_TOKEN;

export function sedumo() {
	return sedumoClient(SEDUMO_API_URL, SEDUMO_TOKEN ?? '');
}
