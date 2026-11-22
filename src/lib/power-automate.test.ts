import { describe, expect, it } from 'vitest';
import { httpAction } from './power-automate.ts';

describe('httpAction', () => {
	it('posts the page’s request to /print as the body', () => {
		const request = { document: { path: 'Product label.template' }, printerId: 'p1', data: { values: { lot: 'L1' } } };
		const action = JSON.parse(httpAction(request, 'https://api.example'));
		expect(action.inputs).toMatchObject({ method: 'POST', uri: 'https://api.example/print', body: request });
		expect(action.inputs.headers['Content-Type']).toBe('application/json');
	});
});
