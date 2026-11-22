import { json } from '@sveltejs/kit';
import { sedumo } from '#lib/server/env.ts';
import { SedumoError } from '#lib/server/sedumo.ts';
import { cleanRequest, requestProblem, type PrintRequest } from '#lib/print-request.ts';

// The label as it would print, as a PNG, from the same body as a print (POST /print/preview). A label that doesn't
// fit the printer comes back with Sedumo's reason.
export const POST = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const problem = requestProblem(body);
	if (problem) return json({ message: problem }, { status: 400 });
	try {
		const png = await sedumo().preview(cleanRequest(body as PrintRequest));
		return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
	} catch (e) {
		if (e instanceof SedumoError) return json({ message: e.reason.slice(0, 300) }, { status: e.status >= 500 ? 502 : e.status });
		throw e;
	}
};
