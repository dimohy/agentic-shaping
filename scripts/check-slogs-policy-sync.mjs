import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const versionMatch = html.match(/HOMEPAGE v[0-9.]+ ↔ SLOGS ([0-9.]+)/);
if (!versionMatch) throw new Error("홈페이지에서 Slogs 정책 버전을 찾을 수 없습니다.");
const expectedVersion = JSON.parse(readFileSync(join(root,'site/release-manifest.json'),'utf8')).policyVersion;
if (versionMatch[1] !== expectedVersion) throw new Error('Homepage policy version differs from the authoritative release manifest.');

const get = async url => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} 응답 실패: ${response.status}`);
  return (await response.text()).trim();
};

const [version, korean, english] = await Promise.all([
  get("https://slogs.dev/prompts/slogs-mcp.version"),
  get("https://slogs.dev/prompts/slogs-mcp.ko.md"),
  get("https://slogs.dev/prompts/slogs-mcp.en.md"),
]);

if (version !== expectedVersion) throw new Error(`정책 버전 불일치: page=${expectedVersion}, server=${version}`);
// Compact core and triggered procedures have separate authority and revision markers.
// Verify preserved obligations at their actual consumer location, not obsolete headings.
for (const [language, core, fragments] of [
  ['ko', korean, ['Prompt Version: '+expectedVersion, 'AS-WF-001', 'AS-DC-001', '실제 검증이 모두 통과', '시도·시간 한도', '원래 산출물·통과 기준·필수 최종 검사', '같은 조건의 측정', '공개 공유는 명시 요청에서만']],
  ['en', english, ['Prompt Version: '+expectedVersion, 'AS-WF-001', 'AS-DC-001', 'Block completion and successors', 'fixed attempt/time limits', 'original deliverables, acceptance and mandatory final checks', 'comparable measurements', 'publish only when explicitly requested']]
]) {
  for (const fragment of fragments) if (!core.includes(fragment)) throw new Error(language+' core contract missing: '+fragment);
  for (const [documentId, required] of [['workflow',['AS-WF-001','AS-LW-001']],['progress',['slogs-progress-report-policy','authoritativeCompleted']],['memory',['MC-COMP-001','captureDoesNotWrite']]]) {
    const procedure = await get('https://slogs.dev/prompts/slogs-policy/'+documentId+'.'+language+'.md');
    if (!procedure.startsWith('<!-- Slogs policy procedure: '+documentId+'; revision: ') || !procedure.split('\n')[0].includes('language: '+language)) throw new Error('Procedure identity mismatch: '+documentId+'/'+language);
    if (!core.includes(documentId)) throw new Error('Core does not route to '+documentId);
    for (const fragment of required) if (!procedure.includes(fragment)) throw new Error(documentId+'/'+language+' contract missing: '+fragment);
  }
}

if (korean.includes("첫 poll은 허용")) {
  throw new Error("ko 정책에 첫 poll 예외가 포함되어 있습니다.");
}
if (/orientation poll/i.test(english)) {
  throw new Error("en policy contains an orientation-poll exception.");
}

process.stdout.write(`Slogs LLM Wiki 한·영 최종 정책 ${expectedVersion} 동기화 검사 통과\n`);
