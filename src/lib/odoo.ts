// An Odoo module that prints a label from a delivery order: a "Print label" button calls Sedumo from Odoo's server
// with `requests` (an Odoo server action can't call out). The request is the page's, written into the code; the
// token and the printer are Odoo system parameters.
import { pythonValue } from './code.ts';
import type { PrintRequest } from './print-request.ts';

export type OdooFile = { path: string; code: string };

export function odooModule(request: PrintRequest, apiUrl: string): OdooFile[] {
	// The printer comes from the system parameter, so the body in the code names it from there.
	const { printerId: _printerId, ...rest } = request;
	const body = pythonValue(rest, 3).replace(/^\{\n/, '{\n                "printerId": printer,\n');
	return [
		{
			path: 'sedumo_print/__manifest__.py',
			code: `{
    "name": "Sedumo Print",
    "summary": "Print labels from delivery orders through Sedumo",
    "version": "1.0.0",
    "depends": ["stock"],
    "data": ["views/stock_picking_views.xml"],
    "license": "LGPL-3",
}
`
		},
		{ path: 'sedumo_print/__init__.py', code: 'from . import models\n' },
		{ path: 'sedumo_print/models/__init__.py', code: 'from . import stock_picking\n' },
		{
			path: 'sedumo_print/models/stock_picking.py',
			code: `import requests

from odoo import _, models
from odoo.exceptions import UserError


class StockPicking(models.Model):
    _inherit = "stock.picking"

    def action_sedumo_print(self):
        # Settings > Technical > System Parameters (developer mode): the API token and the printer's id in Sedumo.
        params = self.env["ir.config_parameter"].sudo()
        token = params.get_param("sedumo.token")
        printer = params.get_param("sedumo.printer_id")
        if not token or not printer:
            raise UserError(_("Set sedumo.token and sedumo.printer_id in the system parameters."))
        for picking in self:
            # The request: your fields go in as values, e.g. picking.name, picking.partner_id.name.
            body = ${body}
            response = requests.post(
                "${apiUrl}/print",
                json=body,
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            answer = response.json()
            if response.status_code != 201:
                # Refused: Sedumo says why.
                raise UserError(_("Sedumo didn't print it: %s", answer.get("message", response.text)))
            picking.message_post(body=_("Label sent to Sedumo, job %s", answer["jobId"]))
`
		},
		{
			path: 'sedumo_print/views/stock_picking_views.xml',
			code: `<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <record id="view_picking_form_sedumo" model="ir.ui.view">
        <field name="name">stock.picking.form.sedumo</field>
        <field name="model">stock.picking</field>
        <field name="inherit_id" ref="stock.view_picking_form"/>
        <field name="arch" type="xml">
            <xpath expr="//header" position="inside">
                <button name="action_sedumo_print" type="object" string="Print label"/>
            </xpath>
        </field>
    </record>
</odoo>
`
		}
	];
}
