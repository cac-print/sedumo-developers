// Dynamics 365 Finance and Operations' label layouts: ZPL with `$Field$` where a value goes. F&O fills them in and
// sends the label to an external label service as base64 (`$label.body:base64$`); this site does the same.

const FIELD = /\$([A-Za-z_][A-Za-z0-9_.]*)\$/g;

/** The fields a layout names, in order, each once. */
export const layoutFields = (layout: string) => [...new Set([...layout.matchAll(FIELD)].map((m) => m[1]))];

/** The layout with each `$Field$` replaced by its value, as F&O fills it. A Map, so a field may be named anything. */
export const fillLayout = (layout: string, values: ReadonlyMap<string, string>) =>
	layout.replace(FIELD, (_, name: string) => values.get(name) ?? '');

/** UTF-8 text as base64. */
export function base64Of(text: string): string {
	let binary = '';
	for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
	return btoa(binary);
}

/** The body F&O's print operation sends, its placeholders as they are typed into F&O. */
export const FO_BODY = '{"document":{"content":"$label.body:base64$","kind":"stream","encoding":"base64"},"printerId":"$label.printer$","data":{"values":{}}}';
