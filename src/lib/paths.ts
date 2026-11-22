// The Start page's paths: each kind of app a developer builds, and where its guide starts.
export type Path = { title: string; text: string; href: string };

export const PATHS: Path[] = [
	{
		title: 'Your ERP or warehouse system prints',
		text: 'One request per print from your server: a label, a printer and its values, many labels in one print, and a retry that never prints twice.',
		href: '/guides/api#4-print'
	},
	{
		title: 'The line keeps printing without the internet',
		text: 'Send the same requests to the Sedumo worker on the plant network when the cloud can’t be reached.',
		href: '/guides/api#8-print-when-the-internet-is-down'
	},
	{
		title: 'A web page on the plant network prints',
		text: 'A browser app prints through a worker on the network over HTTPS, offline too.',
		href: '/guides/api#from-a-browser-app-on-another-pc'
	},
	{
		title: 'Your own printer files and PDFs',
		text: 'Print ZPL your system makes, or a PDF, on label and office printers.',
		href: '/guides/api#7-print-a-file-you-made-yourself'
	},
	{
		title: 'Workers at a site',
		text: 'Install and link workers, and what plant IT needs: the network, printing over the LAN, updates and security.',
		href: '/guides/plant-it'
	},
	{
		title: 'Claude builds it with you',
		text: 'Add the Sedumo skill to Claude Code or the Claude apps, and Claude writes the integration the way Sedumo works.',
		href: '/skill'
	},
	{
		title: 'An AI assistant works with your labels',
		text: 'Connect Claude and other assistants to Sedumo, as you, with only what your role allows.',
		href: '/guides/ai-assistants'
	}
];

/** A link to a guide: its page here, or on developers.sedumo.com when this copy was built without the guides. */
export function guideHref(built: boolean, href: string): string {
	return built || !href.startsWith('/guides') ? href : `https://developers.sedumo.com${href}`;
}
