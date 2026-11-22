// An Oracle WMS label XML: `_FORMAT` names the label (its name in Sedumo, without .template), `_PRINTERNAME` the
// printer by its name or alias, `_QUANTITY` the copies, and each <label> one label's values. A warehouse system sends
// it as it is; Sedumo reads it.
export function oracleXml(options: {
	format: string;
	printerName: string;
	quantity?: number;
	labels: Record<string, string>[];
}): string {
	const attributes = [
		['_FORMAT', options.format],
		['_PRINTERNAME', options.printerName],
		['_QUANTITY', options.quantity && options.quantity > 1 ? String(options.quantity) : undefined]
	]
		.filter(([, value]) => value)
		.map(([name, value]) => ` ${name}="${escape(value!)}"`)
		.join('');
	const labels = options.labels.map(
		(values) =>
			`  <label>\n${Object.entries(values)
				.map(([name, value]) => `    <variable name="${escape(name)}">${escape(value)}</variable>\n`)
				.join('')}  </label>\n`
	);
	return `<?xml version="1.0" encoding="UTF-8"?>\n<labels${attributes}>\n${labels.join('')}</labels>\n`;
}

const escape = (value: string) => value.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
