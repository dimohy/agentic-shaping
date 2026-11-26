import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { planBuild } from './plan.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
const graph = { z: { input: 'Z', deps: ['b', 'a'] }, b: { input: 'B', deps: [] }, a: { input: 'A', deps: [] }, unused: { input: 'U', deps: [] } };

test('closure, globally first ready order, fingerprints, caching and immutability', () => {
  const before = structuredClone(graph);
  const a = hash(['A', []]);
  const b = hash(['B', []]);
  const z = hash(['Z', [['a', a], ['b', b]]]);
  const cached = { a, z: 'old' };
  const cachedBefore = structuredClone(cached);
  const targets = ['z', 'b', 'z'];
  assert.deepEqual(planBuild(graph, cached, targets), {
    ok: true, order: ['a', 'b', 'z'], rebuild: ['b', 'z'], fingerprints: { a, b, z },
  });
  assert.deepEqual(graph, before);
  assert.deepEqual(cached, cachedBefore);
  assert.deepEqual(targets, ['z', 'b', 'z']);
  const reordered = { ...graph, z: { input: 'Z', deps: ['a', 'b'] } };
  assert.deepEqual(planBuild(reordered, cached, ['b', 'z']), planBuild(graph, cached, targets));
  assert.deepEqual(planBuild(graph, { a, b, z }, ['z']).rebuild, []);
});

test('ready nodes are selected anew after each step using ordinal order', () => {
  const g = { Z: { input: '', deps: [] }, a: { input: '', deps: [] }, A: { input: '', deps: ['Z'] } };
  assert.deepEqual(planBuild(g, {}, ['a', 'A']).order, ['Z', 'A', 'a']);
});

test('validates the entire graph even for empty or unrelated targets', () => {
  const bad = [
    { x: { input: '', deps: ['missing'] } },
    { x: { input: '', deps: ['y'] }, y: { input: '', deps: ['x'] } },
    { x: { input: '', deps: ['x', 'x'] } },
    { x: { input: '', deps: [''] } },
    { x: { input: '', deps: Array(1) } },
    { x: { input: 1, deps: [] } },
    { x: { input: '', deps: [], extra: true } },
  ];
  for (const g of bad) {
    const result = planBuild({ good: { input: '', deps: [] }, ...g }, {}, ['good']);
    assert.equal(result.ok, false);
    assert.equal(typeof result.error, 'string');
    assert.ok(result.error.length);
    assert.deepEqual(Object.keys(result).sort(), ['error', 'ok']);
    assert.equal(planBuild(g, {}, []).ok, false);
  }
  assert.equal(planBuild(graph, {}, ['missing']).ok, false);
  assert.deepEqual(planBuild(graph, {}, []), { ok: true, order: [], rebuild: [], fingerprints: {} });
});

test('handles special property names as ordinary IDs', () => {
  const g = JSON.parse('{"__proto__":{"input":"p","deps":[]},"constructor":{"input":"c","deps":["__proto__"]}}');
  const result = planBuild(g, {}, ['constructor']);
  assert.deepEqual(result.order, ['__proto__', 'constructor']);
  assert.equal(Object.hasOwn(result.fingerprints, '__proto__'), true);
  assert.deepEqual(result.rebuild, result.order);
});
