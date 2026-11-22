import { describe, expect, it } from 'vitest';
import { hooksOf } from './hooks.ts';

describe('hooksOf', () => {
	it('lists each value once, in order, with sections and formats', () => {
		expect(hooksOf('^FD{{product}}^FS{{#lot}}^FDLot {{lot}}^FS{{/lot}}^FD{{made|dd.MM.yyyy}}^FS{{product}}')).toEqual([
			'product',
			'lot',
			'made'
		]);
	});
	it('takes spaces round a format, as Sedumo does', () => {
		expect(hooksOf('^FD{{made | dd.MM.yyyy}}^FS')).toEqual(['made']);
	});
});
