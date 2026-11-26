export function applyBatch(snapshot, events) {
  for (const event of events) {
    if (event.seq < snapshot.nextSeq) continue;
    snapshot.balances[event.from] -= event.amount;
    snapshot.balances[event.to] += event.amount;
    snapshot.applied.push(event);
    snapshot.nextSeq = event.seq + 1;
  }
  return { ok: true, state: snapshot };
}
