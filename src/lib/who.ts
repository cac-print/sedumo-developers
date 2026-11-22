// Who prints (Sedumo's `onBehalfOf`): this site has no users, so it asks for a name and keeps it in this browser,
// with an id of its own so two people with the same name stay apart.
export type Who = { id: string; name: string };
const KEY = 'sedumo-examples-who';

export function loadWho(): Who {
	try {
		const kept = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Who | null;
		if (kept?.id) return kept;
	} catch {
		// no storage: a new id each visit
	}
	return { id: crypto.randomUUID().slice(0, 8), name: '' };
}

export function saveWho(who: Who) {
	try {
		if (who.id) localStorage.setItem(KEY, JSON.stringify(who));
	} catch {
		// no storage: the name is asked again next time
	}
}

export const onBehalfOf = (who: Who) => (who.name.trim() ? { id: who.id, name: who.name.trim() } : undefined);
