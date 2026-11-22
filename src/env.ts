import { defineEnvVars } from '@sveltejs/kit/env';

// The server's settings, read when it starts. Both may be missing: the guides and the Start page work without them.
export const variables = defineEnvVars({
	SEDUMO_API_URL: {
		description: 'Sedumo’s API (default https://api.sedumo.com)',
		schema: (value) => value || 'https://api.sedumo.com'
	},
	SEDUMO_TOKEN: {
		description: 'An API token of your Sedumo account: print, printers:read, documents:read, jobs:read. Server only.',
		schema: (value) => value || undefined
	}
});
