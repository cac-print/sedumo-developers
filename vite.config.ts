import cloudflare from '@sveltejs/adapter-cloudflare';
import node from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

// Built for Node by default (`node build`, or the Dockerfile), so a copy of this repo runs anywhere;
// developers.sedumo.com itself runs on Cloudflare Workers (`npm run build:cloudflare`, wrangler.jsonc).
const adapter = process.env.SEDUMO_ADAPTER === 'cloudflare' ? cloudflare() : node();

export default defineConfig({
	plugins: [
		sveltekit({
			adapter,
			// Only the site's own scripts run. Pagefind's search needs WebAssembly ('wasm-unsafe-eval').
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self', 'wasm-unsafe-eval'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self']
				}
			}
		})
	],
	test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'] }
});
