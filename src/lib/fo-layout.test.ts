import { describe, expect, it } from 'vitest';
import { base64Of, fillLayout, FO_BODY, layoutFields } from './fo-layout.ts';

describe('F&O label layouts', () => {
	const layout = '^XA^FD$LicensePlateId$^FS^FD$ItemId$ $LicensePlateId$^FS^XZ';
	it('finds each field once, in order', () => {
		expect(layoutFields(layout)).toEqual(['LicensePlateId', 'ItemId']);
	});
	it('fills each field, an unknown one empty, whatever its name', () => {
		expect(fillLayout(layout, new Map([['LicensePlateId', 'LP1']]))).toBe('^XA^FDLP1^FS^FD LP1^FS^XZ');
		expect(fillLayout('^FD$constructor$ $toString$^FS', new Map())).toBe('^FD ^FS');
	});
	it('sends UTF-8 as base64', () => {
		expect(new TextDecoder().decode(Uint8Array.from(atob(base64Of('č ^FH\\')), (c) => c.charCodeAt(0)))).toBe('č ^FH\\');
	});
	it('has a body template that is JSON once its placeholders are filled', () => {
		const body = JSON.parse(FO_BODY.replace('$label.body:base64$', 'eA==').replace('$label.printer$', 'p1'));
		expect(body).toEqual({ document: { content: 'eA==', kind: 'stream', encoding: 'base64' }, printerId: 'p1', data: { values: {} } });
	});
});
