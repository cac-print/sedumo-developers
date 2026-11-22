import { describe, expect, it } from 'vitest';
import { tokenProblem } from './account.ts';

describe('tokenProblem', () => {
	const token = `sedumo_mt_${'a1B2-_'.repeat(7)}x`;

	it('takes an API token, with spaces around it', () => {
		expect(tokenProblem(token)).toBeNull();
		expect(tokenProblem(`  ${token}\n`)).toBeNull();
	});

	it('says what to paste when it is empty', () => {
		expect(tokenProblem('   ')).toBe('Paste the token first.');
	});

	it('refuses a personal token, and says where API tokens are', () => {
		expect(tokenProblem(`sedumo_pt_${'a'.repeat(43)}`)).toMatch(/AI assistant.*API tokens/);
	});

	it('refuses anything else', () => {
		for (const value of ['hello', `sedumo_mt_short`, `${token} more`, `Bearer ${token}`, `sedumo_mt_${'a'.repeat(101)}`])
			expect(tokenProblem(value)).toMatch(/isn’t a Sedumo API token/);
	});
});
