import type { Printer } from '#lib/server/sedumo.ts';

const REASONS: Record<string, string> = {
	head_open: 'Head open',
	paper_out: 'Out of paper',
	ribbon_out: 'Ribbon out',
	paused: 'Paused',
	cover_open: 'Cover open',
	paper_jam: 'Paper jam'
};

/** A printer's state in a few words, as an app could show it before printing. */
export function printerState(printer: Pick<Printer, 'status' | 'statusReason' | 'checkStatus' | 'worker'>): {
	text: string;
	tone: 'ok' | 'warn' | 'bad' | 'quiet';
} {
	if (!printer.worker || printer.worker.status !== 'online') return { text: 'Its PC is offline', tone: 'bad' };
	if (!printer.checkStatus) return { text: 'Not checked', tone: 'quiet' };
	if (printer.status === 'ready') return { text: 'Ready', tone: 'ok' };
	if (printer.status === 'error')
		return { text: REASONS[printer.statusReason ?? ''] ?? printer.statusReason ?? 'Not ready', tone: 'warn' };
	if (printer.status === 'offline') return { text: 'Not answering', tone: 'bad' };
	return { text: 'Not checked yet', tone: 'quiet' };
}
