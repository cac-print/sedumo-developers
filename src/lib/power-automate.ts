// Power Automate's HTTP action (Premium) set up to send a print: its method, address, headers and body, as the
// action's code view shows them. The token is a placeholder: a flow keeps it out of the action (see the page).
import type { PrintRequest } from './print-request.ts';

export function httpAction(request: PrintRequest, apiUrl: string): string {
	return JSON.stringify(
		{
			type: 'Http',
			inputs: {
				method: 'POST',
				uri: `${apiUrl}/print`,
				headers: { Authorization: 'Bearer <your Sedumo API token>', 'Content-Type': 'application/json' },
				body: request
			}
		},
		null,
		2
	);
}
