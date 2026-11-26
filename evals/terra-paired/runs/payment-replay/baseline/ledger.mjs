export function applyBatch(snapshot, events) {
  const reject = (message) => ({ ok: false, state: snapshot, error: message });
  if (!Array.isArray(events)) return reject('Events must be an array');

  try {
    const byId = new Map();
    const bySeq = new Map();
    const sameEvent = (a, b) =>
      a.seq === b.seq && a.id === b.id && a.from === b.from &&
      a.to === b.to && a.amount === b.amount;

    for (const event of snapshot.applied) {
      byId.set(event.id, event);
      bySeq.set(event.seq, event);
    }

    const pending = [];
    for (const event of events) {
      if (event === null || typeof event !== 'object') return reject('Invalid event');
      const keys = Reflect.ownKeys(event);
      if (keys.length !== 5 || !['seq', 'id', 'from', 'to', 'amount'].every((key) => keys.includes(key))) {
        return reject('Invalid event fields');
      }
      const { seq, id, from, to, amount } = event;
      if (!Number.isSafeInteger(seq) || seq <= 0 ||
          typeof id !== 'string' || id.length === 0 ||
          typeof from !== 'string' || typeof to !== 'string' || from === to ||
          !Object.hasOwn(snapshot.balances, from) || !Object.hasOwn(snapshot.balances, to) ||
          !Number.isSafeInteger(amount) || amount <= 0) {
        return reject('Invalid event');
      }
      const existingId = byId.get(id);
      if (existingId) {
        if (!sameEvent(existingId, event)) return reject('Event ID conflicts with an existing event');
        continue;
      }
      if (bySeq.has(seq)) return reject('Sequence conflicts with an existing event');
      byId.set(id, event);
      bySeq.set(seq, event);
      pending.push(event);
    }

    pending.sort((a, b) => a.seq - b.seq);
    const balances = Object.fromEntries(Object.getOwnPropertyNames(snapshot.balances).map((name) => [name, snapshot.balances[name]]));
    const applied = snapshot.applied.slice();
    let nextSeq = snapshot.nextSeq;
    for (const event of pending) {
      if (event.seq !== nextSeq) return reject('Missing or invalid sequence');
      if (balances[event.from] < event.amount) return reject('Insufficient funds');
      if (balances[event.to] > Number.MAX_SAFE_INTEGER - event.amount) return reject('Recipient balance exceeds safe integer limit');
      balances[event.from] -= event.amount;
      balances[event.to] += event.amount;
      applied.push(event);
      nextSeq++;
    }
    return { ok: true, state: { nextSeq, balances, applied } };
  } catch {
    return reject('Invalid input');
  }
}

