# sedumo-developers

The code of developers.sedumo.com (SvelteKit). What and why: `spec/brief.md`; how to run, build and deploy it:
`README.md`. This repo is **public**: nothing in it may name our own machines, accounts, tokens or private repos'
internals.

- **The guides' text is Sedumo's manual**, fetched when the site is built (`npm run guides`). Never edit it here; a
  fix goes into Sedumo's manual.
- **Sedumo's token stays on the server** (`src/lib/server/`, `$app/env/private`): never in the browser, a response or
  a log. The examples may show Sedumo's answers (they never carry the token); the server takes from the browser only
  what a page sends (`requestProblem`).
- **Texts are written like Sedumo's manual:** plain words, the names on Sedumo's screens exactly as they are, no issue
  numbers or internal names, only public links.
- Before pushing: `npm run check`, `npm test`, `npm run build`.
