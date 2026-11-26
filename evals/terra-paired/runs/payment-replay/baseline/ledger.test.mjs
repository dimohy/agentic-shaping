import assert from 'node:assert/strict';
import { applyBatch } from './ledger.mjs';

const event = (seq, id, from, to, amount) => Object.freeze({ seq, id, from, to, amount });
const first = event(1, 'one', 'a', 'b', 4);
const snapshot = Object.freeze({ nextSeq: 2, balances: Object.freeze({ a: 6, b: 4, c: 0 }), applied: Object.freeze([first]) });
const second = event(2, 'two', 'b', 'c', 3);
const third = event(3, 'three', 'c', 'a', 2);
const replay = Object.freeze({ amount: 4, to: 'b', from: 'a', id: 'one', seq: 1 });
const duplicate = Object.freeze({ amount: 3, id: 'two', seq: 2, to: 'c', from: 'b' });
const result = applyBatch(snapshot, Object.freeze([third, replay, second, duplicate]));
assert.equal(result.ok, true);
assert.deepEqual(result.state, { nextSeq: 4, balances: { a: 8, b: 1, c: 1 }, applied: [first, second, third] });
assert.deepEqual(snapshot.balances, { a: 6, b: 4, c: 0 });
assert.deepEqual(applyBatch(snapshot, []).state, snapshot);

const badBatches = [
  null, {},
  [{ ...first, amount: 5 }],
  [{ ...first, extra: true }],
  [{ ...first, amount: 0 }],
  [event(1, 'other', 'a', 'b', 1)],
  [event(3, 'gap', 'a', 'b', 1)],
  [second, event(2, 'other', 'a', 'b', 1)],
  [second, event(3, 'two', 'a', 'b', 1)],
  [event(2, 'funds', 'c', 'a', 1)],
  [event(2, '', 'a', 'b', 1)],
  [event(2, 'bad', 'a', 'a', 1)],
  [event(2, 'bad', 'a', 'missing', 1)],
  [event(2, 'bad', 'a', 'b', Number.MAX_SAFE_INTEGER + 1)],
  [event(2.5, 'bad', 'a', 'b', 1)],
  [second, event(3, 'funds', 'c', 'a', 4)],
];
for (const batch of badBatches) {
  const outcome = applyBatch(snapshot, batch);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.state, snapshot);
  assert.ok(typeof outcome.error === 'string' && outcome.error.length > 0);
}
const full = Object.freeze({ nextSeq: 1, balances: Object.freeze({ a: 1, b: Number.MAX_SAFE_INTEGER }), applied: Object.freeze([]) });
assert.equal(applyBatch(full, [event(1, 'overflow', 'a', 'b', 1)]).ok, false);
const specialBalances = Object.freeze(Object.assign(Object.create(null), { a: 2, ['__proto__']: 0 }));
const special = Object.freeze({ nextSeq: 1, balances: specialBalances, applied: Object.freeze([]) });
const specialResult = applyBatch(special, [event(1, 'special', 'a', '__proto__', 1)]);
assert.equal(specialResult.ok, true);
assert.equal(specialResult.state.balances.__proto__, 1);
console.log('Ledger tests passed');
