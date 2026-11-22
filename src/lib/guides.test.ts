// With the manual copied in (`npm run guides`), every link on the Start page and between guides must land on a
// heading that exists, so a change to the manual's headings shows here before the site breaks.
import { describe, expect, it } from 'vitest';
import { GUIDES, guidePaths, hasGuides, loadGuide } from './guides.ts';
import { PATHS } from './paths.ts';

const rendered = Object.fromEntries(GUIDES.map((g) => [`/guides/${g.slug}`, loadGuide(g.slug)]));

function landsOnHeading(href: string): boolean {
	const [path, anchor] = href.split('#');
	const guide = rendered[path];
	if (!guide) return false;
	return !anchor || guide.html.includes(`id="${anchor}"`);
}

describe.skipIf(!hasGuides())('the guides as built', () => {
	it('has every guide', () => {
		for (const guide of GUIDES) expect(rendered[`/guides/${guide.slug}`], guide.file).not.toBeNull();
	});
	it('the Start page’s paths land on headings that exist', () => {
		for (const path of PATHS.filter((p) => p.href.startsWith('/guides/')))
			expect(landsOnHeading(path.href), path.href).toBe(true);
	});
	it('links between guides land on headings that exist', () => {
		const internal = /href="(\/guides\/[^"]+|#[^"]+)"/g;
		for (const [path, guide] of Object.entries(rendered)) {
			for (const [, href] of guide!.html.matchAll(internal)) {
				const target = href.startsWith('#') ? `${path}${href}` : href;
				expect(landsOnHeading(target), `${path}: ${href}`).toBe(true);
			}
		}
	});
	it('names every manual file it shows', () => {
		expect(Object.keys(guidePaths).sort()).toEqual(GUIDES.map((g) => g.file).sort());
	});
});
