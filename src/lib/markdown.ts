// Renders a guide from Sedumo's manual: headings get GitHub's anchors (the manual links to them), links to another
// guide point at its page here, and links to manual pages this site doesn't show become plain text.
import { Marked, type Tokens } from 'marked';
import { gfmHeadingId, getHeadingList } from 'marked-gfm-heading-id';

export type Section = { id: string; text: string };
export type RenderedGuide = { title: string; html: string; sections: Section[] };

const escape = (text: string) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Where a link in the manual goes on this site, or null for a manual page this site doesn't show. */
export function linkTarget(href: string, guidePaths: Record<string, string>): string | null {
	if (/^[a-z]+:/i.test(href) || href.startsWith('#') || href.startsWith('/')) return href;
	const [file, anchor] = href.split('#');
	if (!file.endsWith('.md')) return href;
	const path = guidePaths[file.replace(/^\.\//, '')];
	if (!path) return null;
	return anchor ? `${path}#${anchor}` : path;
}

export function renderGuide(source: string, guidePaths: Record<string, string>): RenderedGuide {
	// The page's title is the manual's first heading; the page shows it in its own header.
	const match = source.match(/^#\s+(.+)\s*$/m);
	const title = match ? match[1].trim() : '';
	const body = match ? source.replace(match[0], '') : source;

	const marked = new Marked(gfmHeadingId(), {
		gfm: true,
		renderer: {
			link(token: Tokens.Link) {
				const text = this.parser.parseInline(token.tokens);
				const target = linkTarget(token.href, guidePaths);
				if (target === null) return text;
				const external = /^https?:/i.test(target);
				return `<a href="${escape(target)}"${external ? ' rel="noopener"' : ''}>${text}</a>`;
			},
			table(token: Tokens.Table) {
				// Wide tables scroll inside their own box instead of widening the page.
				const cell = (c: Tokens.TableCell, tag: string) => {
					const align = c.align ? ` style="text-align:${c.align}"` : '';
					return `<${tag}${align}>${this.parser.parseInline(c.tokens)}</${tag}>`;
				};
				const head = `<tr>${token.header.map((c) => cell(c, 'th')).join('')}</tr>`;
				const rows = token.rows.map((r) => `<tr>${r.map((c) => cell(c, 'td')).join('')}</tr>`).join('');
				return `<div class="table"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
			}
		}
	});
	const html = marked.parse(body, { async: false }) as string;
	const sections = getHeadingList()
		.filter((h) => h.level === 2)
		.map((h) => ({ id: h.id, text: h.raw }));
	return { title, html, sections };
}
