// The search index (Pagefind) of the pages built ahead, written into static/pagefind/ (not in git). `npm run build`
// builds once, makes the index from those pages, then builds again so the index is served like any other file
// (the Node server only serves files that existed when it was built).
import { existsSync, rmSync } from 'node:fs';
import * as pagefind from 'pagefind';

const site = '.svelte-kit/output/prerendered/pages';
const output = 'static/pagefind';
if (!existsSync(site)) throw new Error(`No built pages in ${site}: run vite build first`);

rmSync(output, { recursive: true, force: true });
const { index } = await pagefind.createIndex({});
if (!index) throw new Error('Pagefind made no index');
const { errors, page_count } = await index.addDirectory({ path: site });
if (errors.length) throw new Error(errors.join('\n'));
await index.writeFiles({ outputPath: output });
await pagefind.close();
console.log(`Search index: ${page_count} pages, in ${output}`);
