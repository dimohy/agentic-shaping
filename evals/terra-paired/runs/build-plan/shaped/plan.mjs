import { createHash } from 'node:crypto';

export function planBuild(graph, cached, targets) {
  const fail = message => ({ ok: false, error: message });
  if (graph === null || typeof graph !== 'object' || Array.isArray(graph)) {
    return fail('Invalid graph');
  }
  if (cached === null || typeof cached !== 'object' || Array.isArray(cached)) {
    return fail('Invalid cache');
  }
  if (!Array.isArray(targets)) return fail('Invalid targets');

  const ids = Object.keys(graph);
  const entries = new Map();
  for (const id of ids) {
    const entry = graph[id];
    if (!id || entry === null || typeof entry !== 'object' || Array.isArray(entry) ||
        Reflect.ownKeys(entry).length !== 2 || !Object.hasOwn(entry, 'input') ||
        !Object.hasOwn(entry, 'deps') || typeof entry.input !== 'string' ||
        !Array.isArray(entry.deps)) {
      return fail(`Invalid entry: ${id}`);
    }
    const deps = entry.deps;
    if ([...deps].some(dep => typeof dep !== 'string' || !dep) || new Set(deps).size !== deps.length) {
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
    if (typeof target !== 'string' || !entries.has(target)) return fail(`Missing target: ${String(target)}`);
  }

  // Validate the entire graph, including entries outside the requested closure.
  const state = new Map();
  for (const id of ids) {
    if (state.has(id)) continue;
    const stack = [[id, false]];
    while (stack.length) {
      const [current, leaving] = stack.pop();
      if (leaving) { state.set(current, 2); continue; }
      if (state.get(current) === 1) return fail(`Cycle detected: ${current}`);
      if (state.get(current) === 2) continue;
      state.set(current, 1);
      stack.push([current, true]);
      for (const dep of entries.get(current).deps) stack.push([dep, false]);
    }
  }

  const required = new Set();
  const pending = [...targets];
  while (pending.length) {
    const id = pending.pop();
    if (required.has(id)) continue;
    required.add(id);
    pending.push(...entries.get(id).deps);
  }
  const indegree = new Map();
  const dependents = new Map();
  for (const id of required) {
    indegree.set(id, entries.get(id).deps.length);
    for (const dep of entries.get(id).deps) {
      if (!dependents.has(dep)) dependents.set(dep, []);
      dependents.get(dep).push(id);
    }
  }
  const ready = [...required].filter(id => indegree.get(id) === 0).sort();
  const order = [];
  const values = new Map();
  const rebuild = [];
  while (ready.length) {
    const id = ready.shift();
    const entry = entries.get(id);
    const pairs = entry.deps.map(dep => [dep, values.get(dep)]);
    const fingerprint = createHash('sha256').update(JSON.stringify([entry.input, pairs]), 'utf8').digest('hex');
    values.set(id, fingerprint);
    order.push(id);
    if (!Object.hasOwn(cached, id) || cached[id] !== fingerprint) rebuild.push(id);
    for (const dependent of dependents.get(id) ?? []) {
      indegree.set(dependent, indegree.get(dependent) - 1);
      if (indegree.get(dependent) === 0) {
        ready.push(dependent);
        ready.sort();
      }
    }
  }
  return { ok: true, order, rebuild, fingerprints: Object.fromEntries(values) };
}

