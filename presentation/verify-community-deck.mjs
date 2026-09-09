import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, "agentic-shaping-community.html");
const html = await readFile(file, "utf8");
const match = html.match(/<script id="slide-data" type="application\/json">([\s\S]*?)<\/script>/);
if (!match) throw new Error("slide-data JSON이 없습니다.");
const slides = JSON.parse(match[1]);
const errors = [];
const forbiddenOpeners = ["이 표지는", "이 페이지는", "이 마지막 페이지는", "설명하는 페이지입니다"];
const forbiddenTitleEndings = ["합니다", "입니다"];

if (slides.length !== 18) errors.push(`슬라이드 수 ${slides.length} != 18`);
if (slides.reduce((sum, slide) => sum + slide.duration, 0) !== 1205) errors.push("발표 시간 합계가 1205초가 아닙니다.");
for (const [index, slide] of slides.entries()) {
  if (!slide.id || !slide.title || !slide.section || !slide.body) errors.push(`${index + 1}번 장표 필수 필드 누락`);
  if (!slide.notes?.summary) errors.push(`${index + 1}번 장표 summary 누락`);
  if (slide.notes?.steps?.length < 3) errors.push(`${index + 1}번 장표 대사 단계 3개 미만`);
  const opening = `${slide.notes?.summary ?? ""} ${slide.notes?.steps?.[0] ?? ""}`;
  for (const phrase of forbiddenOpeners) if (opening.includes(phrase)) errors.push(`${index + 1}번 장표 금지 도입: ${phrase}`);
  for (const ending of forbiddenTitleEndings) if (slide.title.endsWith(ending)) errors.push(`${index + 1}번 장표 서술형 제목: ${ending}`);
}
const allNotes = slides.flatMap(slide => [slide.notes.summary, ...slide.notes.steps]).join("\n");
const communityCues = ["혹시", "여러분", "떠올려", "해보세요", "보시면", "싶다면"];
const analogyAnchors = ["처음 만난 사람", "음식 사진", "레시피", "좋은 동료", "팀 회의", "냉장고", "셰프", "저울", "도서관", "사서"];
const communityCueCount = communityCues.filter(cue => allNotes.includes(cue)).length;
const analogyCount = analogyAnchors.filter(anchor => allNotes.includes(anchor)).length;
const questionCount = (allNotes.match(/\?/g) ?? []).length;
if (communityCueCount < 5) errors.push(`커뮤니티 청중 호명·참여 단서 부족: ${communityCueCount} < 5`);
if (analogyCount < 8) errors.push(`생활 비유 단서 부족: ${analogyCount} < 8`);
if (questionCount < 5) errors.push(`청중 질문 부족: ${questionCount} < 5`);
const qnaById = Object.fromEntries(slides.filter(slide => slide.section === "Q&A").map(slide => [slide.id, slide]));
for (const id of ["q-long-memory", "q-llm-wiki", "q-one-line", "q-quality"]) {
  if (!qnaById[id]) errors.push(`Q&A 장표 누락: ${id}`);
}
if (!qnaById["q-long-memory"]?.body.includes("여러 자산 중 하나")) errors.push("장기기억과 Agentic Shaping의 포함 관계 설명이 없습니다.");
if (!qnaById["q-llm-wiki"]?.body.includes("기억 인프라") || !qnaById["q-llm-wiki"]?.body.includes("작업 방법론")) errors.push("LLM Wiki와 Agentic Shaping 역할 구분이 없습니다.");
if (!qnaById["q-one-line"]?.body.includes("오늘의 교정") || !qnaById["q-one-line"]?.body.includes("내일의 기본값")) errors.push("Agentic Shaping 한 문장 정의가 없습니다.");
if (!qnaById["q-quality"]?.notes.summary.includes("보장하지")) errors.push("동일 품질 비보장 설명이 없습니다.");
if (!qnaById["q-quality"]?.body.includes("품질 하한") || !qnaById["q-quality"]?.body.includes("편차")) errors.push("품질 안정화 목표 설명이 없습니다.");
for (const required of [
  "data:image/jpeg;base64,",
  "word-break:keep-all",
  "notesMode:'hidden'",
  "state.notesMode==='hidden'",
  "state.notesMode==='drawer'",
  "openPopup()",
  "presenter-toolbar",
  "capturedAt:Date.now()",
  "N · N",
  "popupDocument()",
]) if (!html.includes(required)) errors.push(`필수 계약 누락: ${required}`);
if ((html.match(/data:image\/jpeg;base64,/g) ?? []).length < 3) errors.push("내장 이미지가 3개 미만입니다.");
if (html.includes("presenter-side") || html.includes("metric-box")) errors.push("금지된 발표자 대형 보조 패널 클래스가 있습니다.");

const mainScriptMatch = html.match(/<script>\s*([\s\S]*?)\s*<\/script>\s*<\/body>/);
if (!mainScriptMatch) {
  errors.push("메인 브라우저 스크립트를 찾지 못했습니다.");
} else {
  try {
    new Script(mainScriptMatch[1], { filename: "agentic-shaping-community.main.js" });
  } catch (error) {
    errors.push(`메인 브라우저 스크립트 구문 오류: ${error.message}`);
  }
  const popupScriptMatch = mainScriptMatch[1].match(/<script>([\s\S]*?)<\\\/script>/);
  if (!popupScriptMatch) {
    errors.push("발표자 팝업 스크립트를 찾지 못했습니다.");
  } else {
    try {
      new Script(popupScriptMatch[1], { filename: "agentic-shaping-community.popup.js" });
    } catch (error) {
      errors.push(`발표자 팝업 스크립트 구문 오류: ${error.message}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ok:true,slides:slides.length,notes:slides.filter(s=>s.notes?.summary&&s.notes.steps.length>=3).length,durationSeconds:slides.reduce((sum,s)=>sum+s.duration,0),communityCueCount,analogyCount,questionCount,embeddedImages:(html.match(/data:image\/jpeg;base64,/g)??[]).length,mainScriptSyntax:"ok",popupScriptSyntax:"ok",forbiddenOpeners:0,forbiddenTitleEndings:0},null,2));
