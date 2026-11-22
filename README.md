# Sedumo for developers

The code of [developers.sedumo.com](https://developers.sedumo.com): everything a developer needs to build on
[Sedumo](https://sedumo.com), which prints labels from your software through a Sedumo worker on a PC next to your
printers. What the site holds and why: [spec/brief.md](spec/brief.md).

MIT licensed: copy any part of it into your own app.

## Run it

Node 24 or newer.

```sh
npm ci
npm run dev
```

`npm run check` (types and Svelte), `npm test` (Vitest), `npm run build` (a Node server in `build/`: `node build`).

## The guides

The guides are Sedumo's manual, which lives in Sedumo's own (private) repository. `npm run guides` copies them into
`content/guides/` from `SEDUMO_DOCS_DIR`; without it the site builds with a note on the Guides page, and the guides
stay readable at [developers.sedumo.com/guides](https://developers.sedumo.com/guides). This repo never edits them.

## Search

`npm run build` builds the site, makes a search index of its pages with [Pagefind](https://pagefind.app), and builds
again so the index is served with the site. The dev server has no index.

## Deploy

- **Anywhere Node runs:** `npm run build`, then `node build`, or the `Dockerfile`.
- **Cloudflare Workers** (how developers.sedumo.com runs): `npm run build:cloudflare`, then `npx wrangler deploy`
  with `wrangler.jsonc`. A copy deploying to its own Cloudflare account changes the name and the route there.

developers.sedumo.com deploys from GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main`, and every
hour when Sedumo's manual has changed.
