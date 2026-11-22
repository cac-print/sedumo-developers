// Copies the guides from Sedumo's manual into content/guides/ (not in git), where the site's build reads them.
// The manual is Sedumo's own; this site never edits it. SEDUMO_DOCS_DIR names a folder holding its .md files. Without
// it the site builds with a note on the Guides page instead, so a copy of this repo builds without the manual.
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { GUIDE_FILES } from './guide-files.mjs';

const out = resolve('content/guides');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
if (!process.env.SEDUMO_DOCS_DIR) {
	console.log('No SEDUMO_DOCS_DIR: the site builds without the guides.');
	process.exit(0);
}
const dir = resolve(process.env.SEDUMO_DOCS_DIR);
const missing = GUIDE_FILES.filter((file) => !existsSync(join(dir, file)));
if (missing.length === GUIDE_FILES.length) {
	console.log(`No guides in ${dir}: the site builds without them (SEDUMO_DOCS_DIR names a folder of the manual's .md files).`);
	process.exit(0);
}
if (missing.length) {
	console.error(`Missing in ${dir}: ${missing.join(', ')}`);
	process.exit(1);
}
for (const file of GUIDE_FILES) copyFileSync(join(dir, file), join(out, file));
// Which version of the manual the site shows (its folder's git tree hash), when the build passes it.
writeFileSync(join(out, 'source.json'), JSON.stringify({ version: process.env.SEDUMO_DOCS_VERSION ?? null }) + '\n');
console.log(`${GUIDE_FILES.length} guides copied from ${dir}`);
