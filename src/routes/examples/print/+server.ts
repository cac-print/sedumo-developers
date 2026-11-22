import { json } from '@sveltejs/kit';
import { sedumo } from '#lib/server/env.ts';
import { cleanRequest, requestProblem, type PrintRequest } from '#lib/print-request.ts';

// Sends the request the page shows to Sedumo (POST /print) and returns Sedumo's answer as it came, refusals too.
// Anyone can call this, so it takes only what the page sends: one document, a few copies, short values.
export const POST = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const problem = requestProblem(body);
	if (problem) return json({ message: problem }, { status: 400 });
	// A key of the page's (1 to 200 visible characters), passed on as Sedumo's Idempotency-Key.
	const key = request.headers.get('idempotency-key') ?? undefined;
	if (key !== undefined && !/^[\x21-\x7e]{1,200}$/.test(key)) return json({ message: 'Not an idempotency key' }, { status: 400 });
	return json(await sedumo().print(cleanRequest(body as PrintRequest), key));
};
