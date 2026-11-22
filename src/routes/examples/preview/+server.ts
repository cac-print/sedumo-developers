import { error } from '@sveltejs/kit';
import { sedumo } from '#lib/server/env.ts';
import { SedumoError } from '#lib/server/sedumo.ts';
import type { PrintRequest } from '#lib/print-request.ts';

// The label as it would print, as a PNG, from the same body as a print (POST /print/preview). The page sends the
// request it shows; a label that doesn't fit the printer comes back with Sedumo's reason.
export const POST = async ({ request }) => {
	const body = (await request.json()) as PrintRequest;
	try {
		const png = await sedumo().preview(body);
		return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
	} catch (e) {
		if (e instanceof SedumoError) error(e.status >= 500 ? 502 : e.status, e.reason.slice(0, 300));
		throw e;
	}
};
