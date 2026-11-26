export function planBuild(graph, cached, targets) {
  const order = targets.slice();
  const fingerprints = Object.fromEntries(order.map(id => [id, graph[id]?.input ?? ""]));
  const rebuild = order.filter(id => fingerprints[id] !== cached[id]);
  return { ok: true, order, rebuild, fingerprints };
}
