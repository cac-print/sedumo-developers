import { describe, expect, it } from 'vitest';
import { linkTarget, renderGuide } from './markdown.ts';

const paths = { 'api-guide.md': '/guides/api', 'it-guide.md': '/guides/plant-it' };

describe('linkTarget', () => {
	it('points a link to another guide at its page here, with its anchor', () => {
		expect(linkTarget('api-guide.md', paths)).toBe('/guides/api');
		expect(linkTarget('it-guide.md#dns-rebinding-protection', paths)).toBe('/guides/plant-it#dns-rebinding-protection');
	});
	it('keeps anchors, addresses and absolute paths as they are', () => {
		expect(linkTarget('#4-print', paths)).toBe('#4-print');
		expect(linkTarget('https://status.sedumo.com', paths)).toBe('https://status.sedumo.com');
		expect(linkTarget('mailto:support@sedumo.com', paths)).toBe('mailto:support@sedumo.com');
	});
	it('has no target for a manual page this site doesn’t show', () => {
		expect(linkTarget('operator-guide.md', paths)).toBeNull();
	});
});

describe('renderGuide', () => {
	const md = [
		'# Sedumo API guide',
		'',
		'Intro with [Limits](limits.md), [IT](it-guide.md#x) and [the operators’ guide](operator-guide.md).',
		'',
		'## 1. Get a token',
		'',
		'| A | B |',
		'| - | - |',
		'| `a` | b |',
		'',
		'### From a browser app on another PC',
		'',
		'## 9. Errors'
	].join('\n');
	const guide = renderGuide(md, { ...paths, 'limits.md': '/guides/limits' });

	it('takes the first heading as the title and leaves it out of the text', () => {
		expect(guide.title).toBe('Sedumo API guide');
		expect(guide.html).not.toContain('<h1');
	});
	it('gives headings GitHub’s anchors, which the manual links to', () => {
		expect(guide.html).toContain('id="1-get-a-token"');
		expect(guide.html).toContain('id="from-a-browser-app-on-another-pc"');
		expect(guide.sections).toEqual([
			{ id: '1-get-a-token', text: '1. Get a token' },
			{ id: '9-errors', text: '9. Errors' }
		]);
	});
	it('rewrites links between guides and drops links to pages not shown', () => {
		expect(guide.html).toContain('<a href="/guides/limits">Limits</a>');
		expect(guide.html).toContain('<a href="/guides/plant-it#x">IT</a>');
		expect(guide.html).toContain('the operators’ guide');
		expect(guide.html).not.toContain('operator-guide.md');
	});
	it('puts tables in a box that scrolls', () => {
		expect(guide.html).toContain('<div class="table"><table>');
		expect(guide.html).toContain('<code>a</code>');
	});
});
