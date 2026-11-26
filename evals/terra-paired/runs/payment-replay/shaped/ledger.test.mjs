import assert from 'node:assert/strict';
import { applyBatch } from './ledger.mjs';

const old = { seq: 1, id: 'old', from: 'a', to: 'b', amount: 2 };
const snapshot = { nextSeq: 2, balances: { a: 8, b: 2, c: 0 }, applied: [old] };
const e2 = { seq: 2, id: 'two', from: 'a', to: 'b', amount: 5 };
const e3 = { seq: 3, id: 'three', from: 'b', to: 'c', amount: 6 };
function run(state, events) {
  const beforeState = structuredClone(state);
  const beforeEvents = structuredClone(events);
  const result = applyBatch(state, events);
  assert.deepStrictEqual(state, beforeState);
  assert.deepStrictEqual(events, beforeEvents);
  if (!result.ok) {
    assert.strictEqual(result.state, state);
    assert.equal(typeof result.error, 'string');
    assert.ok(result.error.length > 0);
  }
  return result;
}
const replay = { amount: 2, to: 'b', from: 'a', id: 'old', seq: 1 };
const duplicate = { amount: 5, to: 'b', from: 'a', id: 'two', seq: 2 };
assert.deepStrictEqual(run(snapshot, [e3, replay, e2, duplicate]), {
  ok: true, state: { nextSeq: 4, balances: { a: 3, b: 1, c: 6 }, applied: [old, e2, e3] }
});
for (const events of [
  [{ ...old, amount: 1 }],
  [{ ...old, extra: true }],
  [{ ...old, amount: 0 }],
  [{ ...e2, id: 'old' }],
  [{ ...e2, seq: 1 }],
  [e2, { ...e2, id: 'other' }],
  [e2, { ...e2, amount: 4 }],
  [e3],
  [{ ...e2, seq: 0 }],
  [{ ...e2, seq: Number.MAX_SAFE_INTEGER + 1 }],
  [{ ...e2, amount: 1.5 }],
  [{ ...e2, id: '' }],
  [{ ...e2, to: 'a' }],
  [{ ...e2, to: 'missing' }],
  [{ ...e2, to: 'toString' }],
  [null],
  [{ ...e2, amount: 9 }],
  [e2, { ...e3, amount: 8 }],
]) assert.equal(run(snapshot, events).ok, false, JSON.stringify(events));
assert.equal(run(snapshot, null).ok, false);
const full = { nextSeq: 1, balances: { a: 1, b: Number.MAX_SAFE_INTEGER }, applied: [] };
assert.equal(run(full, [{ seq: 1, id: 'x', from: 'a', to: 'b', amount: 1 }]).ok, false);
assert.equal(run(snapshot, []).ok, true);
Object.freeze(snapshot.balances); Object.freeze(snapshot.applied); Object.freeze(snapshot);
Object.freeze(e2);
assert.equal(applyBatch(snapshot, Object.freeze([e2])).ok, true);
const specialBalances = Object.fromEntries([['__proto__', 2], ['constructor', 0]]);
assert.deepStrictEqual(run({ nextSeq: 1, balances: specialBalances, applied: [] }, [
  { seq: 1, id: 'special', from: '__proto__', to: 'constructor', amount: 1 }
]).state.balances, Object.fromEntries([['__proto__', 1], ['constructor', 1]]));
const symbolEvent = { ...e2, [Symbol('extra')]: 1 };
assert.equal(applyBatch(snapshot, [symbolEvent]).ok, false);
const hiddenBalances = { a: 2 };
Object.defineProperty(hiddenBalances, 'b', { value: 0, enumerable: false });
assert.equal(run({ nextSeq: 1, balances: hiddenBalances, applied: [] }, [
  { seq: 1, id: 'hidden', from: 'a', to: 'b', amount: 1 }
]).state.balances.b, 1);

console.log('Ledger behavior checks passed');
