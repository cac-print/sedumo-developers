import { describe, expect, it } from 'vitest';
import { odooModule } from './odoo.ts';

describe('odooModule', () => {
	const files = odooModule({ document: { path: 'Product label.template' }, printerId: 'p1', data: { values: { lot: 'L"1' } } }, 'https://api.example');
	const model = files.find((f) => f.path.endsWith('stock_picking.py'))?.code ?? '';
	it('has the files an Odoo module needs', () => {
		expect(files.map((f) => f.path)).toEqual([
			'sedumo_print/__manifest__.py',
			'sedumo_print/__init__.py',
			'sedumo_print/models/__init__.py',
			'sedumo_print/models/stock_picking.py',
			'sedumo_print/views/stock_picking_views.xml'
		]);
	});
	it('sends the page’s request with the printer from the system parameters', () => {
		expect(model).toContain('"printerId": printer,');
		expect(model).not.toContain('"p1"');
		expect(model).toContain('"lot": "L\\"1"');
		expect(model).toContain('"https://api.example/print"');
		expect(model).toContain('"onBehalfOf": {"id": str(self.env.user.id), "name": self.env.user.name},');
	});
	it('leaves out who printed on the page: the Odoo user prints', () => {
		const withWho = odooModule(
			{ document: { path: 'a' }, printerId: 'p1', data: { values: {} }, onBehalfOf: { id: 'web1', name: 'Ana' } },
			'https://api.example'
		).find((f) => f.path.endsWith('stock_picking.py'))?.code;
		expect(withWho).not.toContain('Ana');
	});
});
