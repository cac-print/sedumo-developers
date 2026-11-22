/** The values a ZPL file asks for: `{{name}}`, and the names of `{{#name}}` and `{{^name}}` sections, in order. */
export function hooksOf(stream: string): string[] {
	return [...new Set([...stream.matchAll(/\{\{\s*[#^/]?\s*([\w.-]+)(?:\|[^}]*)?\s*\}\}/g)].map((m) => m[1]))];
}
