export function applyBatch(snapshot, events) {
  const reject = (message) => ({ ok: false, state: snapshot, error: message });

  try {
    if (!Array.isArray(events)) return reject('Events must be an array');

    const byId = new Map();
    const bySeq = new Map();
    for (const event of snapshot.applied) {
      byId.set(event.id, event);
      bySeq.set(event.seq, event);
    }

    const sameEvent = (a, b) =>
      a.seq === b.seq && a.id === b.id && a.from === b.from &&
      a.to === b.to && a.amount === b.amount;
    const pending = [];
    for (const input of events) {
      if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        return reject('Invalid event');
      }
      const keys = Reflect.ownKeys(input);
      if (keys.length !== 5 || !['seq', 'id', 'from', 'to', 'amount'].every(
        (key) => Object.prototype.hasOwnProperty.call(input, key)
      )) return reject('Invalid event fields');

      // Read each field once, so validation and application use the same values.
      const event = { seq: input.seq, id: input.id, from: input.from, to: input.to, amount: input.amount };
      if (!Number.isSafeInteger(event.seq) || event.seq <= 0 ||
          !Number.isSafeInteger(event.amount) || event.amount <= 0 ||
          typeof event.id !== 'string' || event.id.length === 0 ||
          typeof event.from !== 'string' || typeof event.to !== 'string' ||
          event.from === event.to ||
          !Object.prototype.hasOwnProperty.call(snapshot.balances, event.from) ||
          !Object.prototype.hasOwnProperty.call(snapshot.balances, event.to)) {
        return reject('Invalid event');
      }

      const known = byId.get(event.id);
      if (known) {
        if (!sameEvent(known, event)) return reject('Event ID conflicts with an existing event');
        continue;
      }
      if (bySeq.has(event.seq)) return reject('Sequence is already used');
      byId.set(event.id, event);
      bySeq.set(event.seq, event);
      pending.push(event);
    }

    pending.sort((a, b) => a.seq - b.seq);
    const balances = Object.fromEntries(Object.getOwnPropertyNames(snapshot.balances).map(
      (name) => [name, snapshot.balances[name]]
    ));
    let nextSeq = snapshot.nextSeq;
    for (const event of pending) {
      if (event.seq !== nextSeq) return reject('Missing or invalid sequence');
      if (balances[event.from] < event.amount) return reject('Insufficient funds');
      if (balances[event.to] > Number.MAX_SAFE_INTEGER - event.amount) {
        return reject('Recipient balance exceeds the safe integer limit');
      }
      balances[event.from] -= event.amount;
      balances[event.to] += event.amount;
      nextSeq += 1;
    }
    return { ok: true, state: { nextSeq, balances, applied: [...snapshot.applied, ...pending] } };
  } catch {
    return reject('Invalid events');
  }
}

