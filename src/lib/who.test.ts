import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadWho, onBehalfOf } from './who.ts';

describe('who prints', () => {
	afterEach(() => vi.unstubAllGlobals());
	it('reads a stored value without a name as no name, not a broken page', () => {
		vi.stubGlobal('localStorage', { getItem: () => '{"id":"ab12cd34"}', setItem: () => {} });
		expect(loadWho()).toEqual({ id: 'ab12cd34', name: '' });
		expect(onBehalfOf(loadWho())).toBeUndefined();
	});
	it('sends the name, trimmed, with the id', () => {
		expect(onBehalfOf({ id: 'a1', name: ' Ana Novak ' })).toEqual({ id: 'a1', name: 'Ana Novak' });
	});
});
