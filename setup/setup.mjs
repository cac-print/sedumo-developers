// Loads the examples' sample labels into a Sedumo account, with an API token that may read and write documents:
//
//   SEDUMO_TOKEN=sedumo_mt_… npm run setup
//
// Safe to run again: a label already there is left alone (UPDATE_LABELS=1 saves a new version). SEDUMO_API_URL
// names another Sedumo (default https://api.sedumo.com). A token can't store files, so it lists the sample files to
// upload once by hand in Sedumo, and which of them are there already.
import { LABELS, FILES } from './labels.mjs';

const api = (process.env.SEDUMO_API_URL ?? 'https://api.sedumo.com').replace(/\/+$/, '');
const token = process.env.SEDUMO_TOKEN;
if (!token) {
	console.error('Set SEDUMO_TOKEN to an API token with documents:read and documents:write.');
	process.exit(1);
}

async function call(method, path, body) {
	const response = await fetch(`${api}${path}`, {
		method,
		headers: { Authorization: `Bearer ${token}`, ...(body && { 'Content-Type': 'application/json' }) },
		body: body && JSON.stringify(body)
	});
	const text = await response.text();
	if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : null;
}

// The account's documents at the top level, by name. Lists come bare or wrapped.
const listed = await call('GET', '/documents');
const documents = Array.isArray(listed) ? listed : (listed.documents ?? []);
const atTop = new Map(documents.filter((d) => !d.path.includes('/')).map((d) => [d.name, d]));

for (const [name, label] of Object.entries(LABELS)) {
	const existing = atTop.get(`${name}.template`);
	const content = { ...label, dpis: [203, 300, 600] };
	if (!existing) {
		await call('POST', '/designer/templates', { name, ...content });
		console.log(`${name}: saved`);
	} else if (process.env.UPDATE_LABELS === '1') {
		await call('PUT', `/designer/templates/${existing.id}`, { ...content, baseVersion: existing.version });
		console.log(`${name}: new version`);
	} else {
		console.log(`${name}: already there`);
	}
}

const missing = FILES.filter((f) => !atTop.has(f.name));
for (const f of FILES) if (!missing.includes(f)) console.log(`${f.name}: already there`);
if (missing.length) {
	console.log('\nUpload these once in Sedumo (Documents → Upload, at the top level), from setup/files/:');
	for (const f of missing) console.log(`  ${f.file}  as  “${f.name}”  (${f.prints})`);
}
