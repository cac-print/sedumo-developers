import { json } from '@sveltejs/kit';
import { sedumo } from '#lib/server/env.ts';
import { SedumoError } from '#lib/server/sedumo.ts';

// A print's status, which the page asks for every second (GET /print-jobs/:id, from this server with the token).
export const GET = async ({ params }) => {
	try {
		return json(await sedumo().job(params.id), { headers: { 'Cache-Control': 'no-store' } });
	} catch (e) {
		if (e instanceof SedumoError) return json(e.body, { status: e.status });
		throw e;
	}
};
