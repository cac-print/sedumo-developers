// A PDF a system makes itself (here with pdf-lib, in the browser; any PDF library or report tool does): an A4
// delivery note. It prints as it is on a printer set up for PDFs.
export type DeliveryNote = { number: string; customer: string; address: string; items: string };

export async function deliveryNotePdf(note: DeliveryNote): Promise<Uint8Array> {
	const { PDFDocument, StandardFonts } = await import('pdf-lib');
	const pdf = await PDFDocument.create();
	pdf.setTitle(`Delivery note ${note.number}`);
	const page = pdf.addPage([595.28, 841.89]);
	const regular = await pdf.embedFont(StandardFonts.Helvetica);
	const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
	// The standard fonts have only WinAnsi's characters: anything else prints as "?".
	const known = new Set(regular.getCharacterSet());
	const printable = (text: string) => [...text].map((c) => (known.has(c.codePointAt(0)!) ? c : '?')).join('');
	let y = 841.89 - 56;
	const line = (text: string, size = 11, font = regular, gap = 6) => {
		page.drawText(printable(text), { x: 56, y: (y -= size), size, font });
		y -= gap;
	};
	line(`Delivery note ${note.number}`, 22, bold, 18);
	line(note.customer, 12, bold);
	for (const part of note.address.split('\n')) line(part);
	y -= 18;
	for (const item of note.items.split('\n').filter((l) => l.trim())) line(item, 12);
	y -= 24;
	line('Received by: ______________________');
	return pdf.save();
}

/** Bytes as base64, as the request carries a file that isn't text. */
export function toBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(binary);
}
