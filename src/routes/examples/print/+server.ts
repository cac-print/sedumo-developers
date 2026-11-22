import { json } from '@sveltejs/kit';
import { sedumo } from '#lib/server/env.ts';
import { cleanRequest, requestProblem, type PrintRequest } from '#lib/print-request.ts';

// Sends the request the page shows to Sedumo (POST /print) and returns Sedumo's answer as it came, refusals too.
// Anyone can call this, so it takes only what the page sends: one document, a few copies, short values.
export const POST = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const problem = requestProblem(body);
	if (problem) return json({ message: problem }, { status: 400 });
	return json(await sedumo().print(cleanRequest(body as PrintRequest)));
};
