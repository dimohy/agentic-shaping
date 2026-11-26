import { createHash } from 'node:crypto';

export function planBuild(graph, cached, targets) {
  const fail = message => ({ ok: false, error: message });
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!isRecord(graph) || !isRecord(cached) || !Array.isArray(targets)) {
    return fail('Invalid graph, cache, or targets');
  }

  const ids = Object.keys(graph);
  const entries = new Map();
  for (const id of ids) {
    const entry = graph[id];
    if (!isRecord(entry) || Reflect.ownKeys(entry).length !== 2 ||
        !Object.hasOwn(entry, 'input') || !Object.hasOwn(entry, 'deps') ||
        typeof entry.input !== 'string' || !Array.isArray(entry.deps)) {
      return fail(`Invalid entry: ${id}`);
    }
    const deps = entry.deps;
    if (deps.some(dep => typeof dep !== 'string' || !dep) || new Set(deps).size !== deps.length) {
      return fail(`Invalid dependencies: ${id}`);
    }
    entries.set(id, { input: entry.input, deps: [...deps].sort() });
  }
  for (const [id, entry] of entries) {
    for (const dep of entry.deps) {
      if (!entries.has(dep)) return fail(`Missing dependency ${dep} for ${id}`);
    }
  }
  for (const target of targets) {
    if (typeof target !== 'string' || !entries.has(target)) return fail(`Invalid or missing target: ${String(target)}`);
  }

  // Validate cycles across the whole manifest, including unreachable steps.
  const remaining = new Map(ids.map(id => [id, entries.get(id).deps.length]));
  const dependents = new Map(ids.map(id => [id, []]));
  for (const [id, entry] of entries) {
    for (const dep of entry.deps) dependents.get(dep).push(id);
  }
  const queue = ids.filter(id => remaining.get(id) === 0);
  for (let i = 0; i < queue.length; i++) {
    for (const next of dependents.get(queue[i])) {
      remaining.set(next, remaining.get(next) - 1);
      if (remaining.get(next) === 0) queue.push(next);
    }
  }
  if (queue.length !== ids.length) return fail('Cyclic graph');

  const required = new Set();
  const pending = [...targets];
  while (pending.length) {
    const id = pending.pop();
    if (required.has(id)) continue;
    required.add(id);
    pending.push(...entries.get(id).deps);
  }
  const counts = new Map([...required].map(id => [id, entries.get(id).deps.length]));
  const ready = [...required].filter(id => counts.get(id) === 0);
  const order = [];
  const rebuild = [];
  const fingerprints = {};
  while (ready.length) {
    ready.sort();
    const id = ready.shift();
    const entry = entries.get(id);
    const pairs = entry.deps.map(dep => [dep, fingerprints[dep]]);
    const fingerprint = createHash('sha256').update(JSON.stringify([entry.input, pairs]), 'utf8').digest('hex');
    Object.defineProperty(fingerprints, id, { value: fingerprint, enumerable: true, configurable: true, writable: true });
    order.push(id);
    if (!Object.hasOwn(cached, id) || cached[id] !== fingerprint) rebuild.push(id);
    for (const next of dependents.get(id)) {
      if (!required.has(next)) continue;
      counts.set(next, counts.get(next) - 1);
      if (counts.get(next) === 0) ready.push(next);
    }
  }
  return { ok: true, order, rebuild, fingerprints };
}

