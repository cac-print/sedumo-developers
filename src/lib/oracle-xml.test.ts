import { describe, expect, it } from 'vitest';
import { oracleXml } from './oracle-xml.ts';

describe('oracleXml', () => {
	it('names the label, the printer and the copies, a <label> per record, escaped', () => {
		const xml = oracleXml({ format: 'Product label', printerName: 'ZPL 203 dpi', quantity: 2, labels: [{ product: 'Milk & cream' }] });
		expect(xml).toContain('<labels _FORMAT="Product label" _PRINTERNAME="ZPL 203 dpi" _QUANTITY="2">');
		expect(xml).toContain('<variable name="product">Milk &#38; cream</variable>');
	});
	it('leaves out one copy', () => {
		expect(oracleXml({ format: 'L', printerName: 'P', quantity: 1, labels: [{}] })).not.toContain('_QUANTITY');
	});
});
