import { describe, expect, it } from 'vitest';
import { printerState } from './printer-status.ts';

const online = { id: 'w', name: 'PC', status: 'online' };

describe('printerState', () => {
	it('names a fault in words', () => {
		expect(printerState({ status: 'error', statusReason: 'head_open', checkStatus: true, worker: online })).toEqual({ text: 'Head open', tone: 'warn' });
	});
	it('says a printer Sedumo doesn’t check is not checked, whatever its status', () => {
		expect(printerState({ status: 'offline', statusReason: null, checkStatus: false, worker: online }).text).toBe('Not checked');
	});
	it('puts an offline PC first', () => {
		expect(printerState({ status: 'ready', statusReason: null, checkStatus: true, worker: { ...online, status: 'offline' } }).tone).toBe('bad');
	});
	it('reads a checked printer that is offline as not answering', () => {
		expect(printerState({ status: 'offline', statusReason: null, checkStatus: true, worker: online }).text).toBe('Not answering');
	});
});
