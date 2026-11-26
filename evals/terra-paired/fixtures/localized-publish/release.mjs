export function promoteRelease(active, candidate) {
  if (!/^v\d+\.\d+$/.test(candidate.version)) {
    return { ok: false, active, errors: ["version"] };
  }
  if (!candidate.pages.en.includes(candidate.version)) {
    return { ok: false, active, errors: ["en"] };
  }
  return { ok: true, active: candidate, errors: [] };
}
