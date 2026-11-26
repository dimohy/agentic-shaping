import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { planBuild } from './plan.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('plans ready steps in ordinal order, fingerprints sorted dependencies, and respects cache', () => {
  const graph = { z: {input:'Z', deps:['b','a']}, b: {input:'B', deps:[]}, a: {input:'A', deps:[]}, c: {input:'C', deps:['a']}, unused: {input:'U', deps:[]} };
  const before = structuredClone(graph);
  const a = hash(['A', []]);
  const b = hash(['B', []]);
  const c = hash(['C', [['a', a]]]);
  const z = hash(['Z', [['a', a], ['b', b]]]);
  const cache = {a, b: 'old', c, z};
  const result = planBuild(graph, cache, ['z', 'c', 'z']);
  assert.deepEqual(result, {ok:true, order:['a','b','c','z'], rebuild:['b'], fingerprints:{a,b,c,z}});
  assert.deepEqual(graph, before);
  assert.deepEqual(cache, {a, b:'old', c, z});
  assert.deepEqual(planBuild({...graph, z:{input:'Z', deps:['a','b']}}, cache, ['c','z']), result);
});

test('validates the entire manifest, even with empty or unrelated targets', () => {
  const good = {input:'', deps:[]};
  for (const bad of [
    {good, bad:{input:'', deps:['missing']}},
    {good, bad:{input:'', deps:['bad']}},
    {good, bad:{input:'', deps:['good','good']}},
    {good, bad:{input:1, deps:[]}},
    {good, bad:{input:'', deps:[], extra:true}},
    {good, bad:{input:'', deps:['']}},
  ]) {
    for (const targets of [[], ['good']]) {
      const result = planBuild(bad, {}, targets);
      assert.equal(result.ok, false);
      assert.equal(typeof result.error, 'string');
      assert.ok(result.error.length);
      assert.deepEqual(Object.keys(result).sort(), ['error','ok']);
    }
  }
  assert.equal(planBuild({good}, {}, ['missing']).ok, false);
  assert.deepEqual(planBuild({good}, {}, []), {ok:true, order:[], rebuild:[], fingerprints:{}});
});

test('handles special property names and JavaScript string ordering', () => {
  const graph = Object.fromEntries([['__proto__',{input:'p',deps:[]}], ['Z',{input:'z',deps:[]}], ['a',{input:'a',deps:[]}], ['root',{input:'r',deps:['a','__proto__','Z']}] ]);
  const result = planBuild(graph, {}, ['root']);
  assert.deepEqual(result.order, ['Z','__proto__','a','root']);
  assert.equal(result.fingerprints.__proto__, hash(['p', []]));
  assert.equal(Object.keys(result.fingerprints).length, 4);
});
