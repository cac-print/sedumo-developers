// The examples, a page each (src/routes/examples/<slug>). `ready: false` shows the case in the list as coming.
export type Example = { slug: string; title: string; group: string; summary: string; guide: string; ready: boolean };

export const EXAMPLES: Example[] = [
	{
		slug: 'print-a-label',
		title: 'Print a label',
		group: 'Print from your system',
		summary: 'A label designed in Sedumo, a printer, and the values to put on it.',
		guide: '/guides/api#4-print',
		ready: true
	},
	{ slug: 'many-labels', title: 'Many labels in one print', group: 'Print from your system', summary: 'Records, or only what changes from one label to the next.', guide: '/guides/api#4-print', ready: true },
	{ slug: 'series', title: 'A series with counters', group: 'Print from your system', summary: 'Numbered labels, counted by your app.', guide: '/guides/api#4-print', ready: true },
	{ slug: 'your-zpl', title: 'Your own ZPL', group: 'Your own files', summary: 'Printer commands your system makes.', guide: '/guides/api#7-print-a-file-you-made-yourself', ready: true },
	{ slug: 'stored-file', title: 'A file stored in Sedumo', group: 'Your own files', summary: 'A ZPL file or a PDF kept in Sedumo.', guide: '/guides/api#4-print', ready: true },
	{ slug: 'your-pdf', title: 'A PDF you made', group: 'Your own files', summary: 'A PDF from your system, to an office printer.', guide: '/guides/api#7-print-a-file-you-made-yourself', ready: true },
	{ slug: 'pdf-form', title: 'A PDF form', group: 'Your own files', summary: 'A PDF whose fields take the print’s values.', guide: '/guides/api#4-print', ready: true },
	{ slug: 'oracle-xml', title: 'Oracle WMS XML', group: 'Integrations', summary: 'The XML your warehouse system already sends.', guide: '/guides/api#7-print-a-file-you-made-yourself', ready: true },
	{ slug: 'retry', title: 'A retry that prints once', group: 'Reliability', summary: 'Send again after a timeout without printing twice.', guide: '/guides/api#4-print', ready: true },
	{ slug: 'offline', title: 'Printing without the internet', group: 'Reliability', summary: 'The same requests to the worker on the plant network.', guide: '/guides/api#8-print-when-the-internet-is-down', ready: false },
	{ slug: 'browser', title: 'A web page on the plant network', group: 'Reliability', summary: 'A browser prints through a worker over HTTPS.', guide: '/guides/api#from-a-browser-app-on-another-pc', ready: false }
];

export const GROUPS = [...new Set(EXAMPLES.map((e) => e.group))];
