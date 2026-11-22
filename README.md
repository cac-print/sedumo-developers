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

## Sample labels

The examples print two sample labels and three files. To load them into your own Sedumo account, make an API token
there (Settings → Access → API tokens) with `documents:read` and `documents:write`, then:

```sh
SEDUMO_TOKEN=sedumo_mt_… npm run setup
```

It saves the labels and lists the files in `setup/files/` to upload once in Sedumo.

## The guides

The guides are Sedumo's manual, which lives in Sedumo's own (private) repository. `npm run guides` copies them into
`content/guides/` from `SEDUMO_DOCS_DIR`; without it the site builds with a note on the Guides page, and the guides
stay readable at [developers.sedumo.com/guides](https://developers.sedumo.com/guides). This repo never edits them.

## The Claude skill

`skills/sedumo/` is an Agent Skill that teaches Claude how to build on Sedumo (`SKILL.md`, and
`references/api.md` for the details). The build publishes it at `/skills/sedumo/` and as `/skills/sedumo.zip`; the
page `/skill` says how to add it. After editing the skill, restart `npm run dev` to see the change there.

## The code in fourteen languages

Each example shows its request in curl, C#, VB.NET, Java, Python, Node.js, PHP, Go, Ruby and PowerShell, and for code
that runs inside an application in ABAP (SAP), X++ (Dynamics 365 Finance and Operations), AL (Business Central) and
Excel VBA (`src/lib/code.ts`), made from the same request the page sends. `node scripts/run-code.ts` runs every one
that runs on its own and checks that each sends exactly that request, to a local server; with `SEDUMO_TOKEN` (and
`SEDUMO_API_URL`) also against Sedumo, where each print must be queued. CI does both, the second with the repo's
`SEDUMO_STAGING_TOKEN` on a test copy of Sedumo. It uses each language's own tools, or with
`--docker` their official images.

## Search

`npm run build` builds the site, makes a search index of its pages with [Pagefind](https://pagefind.app), and builds
again so the index is served with the site. The dev server has no index.

## Deploy

- **Anywhere Node runs:** `npm run build`, then `BODY_SIZE_LIMIT=4M node build` (a PDF sent with a print is bigger
  than Node's default 512 KB), or the `Dockerfile`, which sets it.
- **Cloudflare Workers** (how developers.sedumo.com runs): `npm run build:cloudflare`, then `npx wrangler deploy`
  with `wrangler.jsonc`. A copy deploying to its own Cloudflare account changes the name and the route there.

developers.sedumo.com deploys from GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main`, and every
hour when Sedumo's manual has changed.
