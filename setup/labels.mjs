// The sample labels the examples print, in Sedumo's label format (millimetres). `npm run setup` saves them as
// templates; Sedumo makes each printer language's version from them.

const text = (xMm, yMm, value, fontSizeMm, extra = {}) => ({ type: 'text', xMm, yMm, value, fontSizeMm, ...extra });
const box = (xMm, yMm, widthMm, heightMm, thicknessMm = 0.3) => ({ type: 'box', xMm, yMm, widthMm, heightMm, thicknessMm });

export const LABELS = {
	// 60 x 40 mm, on each product: a choice, a date printed in its own format, a number, and required values.
	'Product label': {
		layout: {
			widthMm: 60,
			heightMm: 40,
			elements: [
				text(2, 1.5, '{{product}}', 3.4, { widthMm: 56, maxLines: 1 }),
				text(2, 7, 'Net weight {{weight|0.000}} kg', 2.4),
				text(2, 11, 'Best before {{best_before|dd.MM.yyyy}}', 2.4),
				text(2, 15, 'Lot {{lot}}', 2.4),
				box(2, 19.5, 56, 0.3),
				{ type: 'barcode', symbology: 'ean13', xMm: 2, yMm: 22, value: '{{ean}}', heightMm: 12, moduleWidthMm: 0.3 },
				{ type: 'barcode', symbology: 'qr', xMm: 44, yMm: 22, value: 'LOT {{lot}}', heightMm: 14, widthMm: 14 }
			]
		},
		examples: { product: 'Milk 1 l', weight: '1.030', best_before: '2026-12-10', lot: 'L2026-10', ean: '3830000000017' },
		variableSettings: {
			product: { caption: 'Product', input: 'choice', choices: ['Milk 1 l', 'Butter 250 g', 'Yoghurt 500 g'], required: true },
			weight: { caption: 'Net weight (kg)', input: 'number' },
			best_before: { caption: 'Best before', input: 'date', required: true },
			lot: { caption: 'Lot', required: true },
			ean: { caption: 'EAN-13' }
		}
	},
	// 100 x 150 mm, on each pallet: a GS1-128 barcode, and a serial for a series of labels.
	'Pallet label': {
		layout: {
			widthMm: 100,
			heightMm: 150,
			elements: [
				text(4, 4, 'PALLET', 6),
				text(4, 14, '{{product}}', 5, { widthMm: 92, maxLines: 2 }),
				box(4, 28, 92, 0.4),
				text(4, 32, 'GTIN', 2.6),
				text(4, 36, '{{gtin}}', 4.5),
				text(4, 46, 'Lot', 2.6),
				text(4, 50, '{{lot}}', 4.5),
				text(52, 46, 'Quantity', 2.6),
				text(52, 50, '{{qty}}', 4.5),
				text(4, 60, 'Pallet', 2.6),
				text(4, 64, '{{serial}}', 4.5),
				box(4, 74, 92, 0.4),
				{
					type: 'barcode',
					symbology: 'gs1-128',
					xMm: 4,
					yMm: 80,
					value: '(01){{gtin}}(10){{lot}}(37){{qty}}(21){{serial}}',
					heightMm: 28,
					moduleWidthMm: 0.33
				}
			]
		},
		examples: { product: 'Milk 1 l, 12 x 1 l', gtin: '03830000000017', lot: 'L2026-10', qty: '48', serial: '0001' },
		variableSettings: {
			product: { caption: 'Product', required: true },
			gtin: { caption: 'GTIN (14 digits)', required: true },
			lot: { caption: 'Lot', required: true },
			qty: { caption: 'Cases on the pallet', input: 'number', required: true },
			serial: { caption: 'Pallet number', required: true }
		}
	}
};

// The files the examples print as they are. A token can't store files, so someone uploads these once in Sedumo
// (Documents → Upload), at the top level, under these names.
export const FILES = [
	{ name: 'Shipping mark.zpl', file: 'shipping-mark.zpl', prints: 'on ZPL printers' },
	{ name: 'Packing list.pdf', file: 'packing-list.pdf', prints: 'on printers set up for PDF' },
	{ name: 'Tyre storage receipt.pdf', file: 'tyre-storage-receipt.pdf', prints: 'a PDF form: its fields take the print’s values' }
];
