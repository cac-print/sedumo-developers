import { json, error } from '@sveltejs/kit';
import { sedumo } from '#lib/server/env.ts';
import { cleanRequest, type PrintRequest } from '#lib/print-request.ts';

// Sends the request the page shows to Sedumo (POST /print) and returns Sedumo's answer as it came, refusals too.
export const POST = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as PrintRequest | null;
	if (!body?.document || !body.printerId || typeof body.data?.values !== 'object') error(400, 'Not a print request');
	return json(await sedumo().print(cleanRequest(body)));
};
