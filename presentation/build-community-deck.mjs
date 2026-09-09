import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const output = join(here, "agentic-shaping-community.html");

const imageFiles = {
  hero: "agentic-shaping-hero.jpg",
  loop: "agentic-shaping-loop.jpg",
  system: "agentic-shaping-system.jpg",
};

const images = Object.fromEntries(
  await Promise.all(
    Object.entries(imageFiles).map(async ([key, file]) => {
      const bytes = await readFile(join(root, "assets", file));
      return [key, `data:image/jpeg;base64,${bytes.toString("base64")}`];
    }),
  ),
);

const slides = [
  {
    id: "opening",
    section: "OPENING",
    title: "AI가 나를 배울수록, 일의 방식도 진화한다",
    kicker: "AGENTIC SHAPING",
    body: `<div class="title-copy"><p class="hero-line">좋은 결과를 한 번 얻는 데서 멈추지 않고,<br><em>다음 실행이 더 나아지는 작업법</em></p><p class="hero-sub">교정 · 취향 · 실패 · 성공 기준을 재사용 가능한 자산으로 바꾼다</p></div>`,
    visual: "title",
    duration: 45,
    notes: {
      summary: "혹시 AI와 정말 잘 끝낸 일이 있는데, 며칠 뒤 다시 켜니 처음 만난 사람처럼 느껴진 적 있으신가요? 오늘 이야기는 바로 그 답답함에서 시작합니다.",
      steps: [
        "우리는 작업할 때마다 ‘이 말투가 좋아요’, ‘이 오류는 꼭 먼저 잡아주세요’, ‘완료는 여기까지예요’라고 알려줍니다. 사실 이미 AI를 계속 가르치고 있는 셈입니다.",
        "그런데 그 가르침이 대화창 안에서만 끝나면 다음 작업은 또 원점입니다. 에이전틱 셰이핑은 오늘의 교정을 내일의 기본값으로 바꾸는 방법입니다.",
        "어려운 이론보다 여러분이 이미 겪은 장면부터 살펴보고, 마지막에는 다음 요청에 바로 붙여 넣을 한 문장까지 가져가 보겠습니다.",
      ],
    },
  },
  {
    id: "friction",
    section: "WHY",
    title: "매번 처음 만난 사람처럼 다시 설명하는 AI",
    kicker: "익숙한 불편",
    body: `<div class="quote-stage"><p>“지난번에는 잘했는데,<br>왜 오늘은 또 처음부터 설명해야 하지?”</p><div class="repeat-line"><span>요청</span><b>→</b><span>결과</span><b>→</b><span class="fade">망각</span><b>↺</b></div></div>`,
    visual: "dark",
    duration: 60,
    notes: {
      summary: "AI가 못해서 답답한 순간보다, 지난번에 알려준 것을 또 설명해야 해서 지치는 순간이 더 많습니다.",
      steps: [
        "문서를 맡기면 ‘너무 딱딱하게 쓰지 마세요’, 코드를 맡기면 ‘경고를 그냥 숨기지 마세요’, 이미지를 맡기면 ‘이 스타일은 싫어요’라고 말하죠.",
        "그 순간에는 잘 고쳐집니다. 그런데 새 대화를 열면 그 합의가 증발합니다. 마치 매일 새 팀원에게 같은 인수인계를 반복하는 느낌입니다.",
        "여기서 질문이 하나 생깁니다. 이 반복을 내가 계속 기억할까요, 아니면 작업 시스템이 먼저 기억하고 적용하게 만들까요? 에이전틱 셰이핑은 두 번째 선택입니다.",
      ],
    },
  },
  {
    id: "leak",
    section: "WHY",
    title: "좋은 결과 뒤에 남아야 할 것이 사라진다",
    kicker: "결과물 밖의 자산",
    body: `<div class="leak-map"><div class="work"><small>작업 중 드러난 것</small><strong>취향 · 교정 · 실패 원인<br>완료 기준 · 반복 판단</strong></div><div class="leak-arrow"><span>결과물만 저장</span><i></i></div><div class="archive"><small>남은 것</small><strong>파일 1개</strong><span>다음 실행은 다시 추측</span></div></div>`,
    visual: "paper",
    duration: 65,
    notes: {
      summary: "최종 파일은 남았는데 다음에도 잘할 방법은 남지 않았다면, 결과의 절반만 저장한 셈입니다.",
      steps: [
        "완성된 파일은 잘 찍힌 음식 사진과 비슷합니다. 무엇을 만들었는지는 보이지만, 어떤 재료와 순서가 그 맛을 만들었는지는 알기 어렵습니다.",
        "AI도 결과 파일만 보면 왜 이 선택이 좋았는지 다시 추측해야 합니다. 우리가 반복해서 말한 기준은 사진이 아니라 레시피인데, 그 레시피가 빠진 겁니다.",
        "에이전틱 셰이핑은 결과와 함께 그 레시피도 남깁니다. 그래서 다음 작업은 추측이 아니라 검증된 판단 기준에서 출발합니다.",
      ],
    },
  },
  {
    id: "definition",
    section: "WHAT",
    title: "Agentic Shaping | 결과가 아니라 접근 방식의 진화",
    kicker: "핵심 정의",
    body: `<div class="image-split"><div class="copy"><p class="definition">Agent가 작업 중 드러난 사람의 <b>암묵지·취향·교정·실패·성공 기준·데이터</b>를 능동적으로 감지하고, 다음 실행에서 먼저 적용할 <b>정형 자산</b>으로 빚는 작업법</p><div class="before-after"><span>대답하는 AI</span><b>→</b><span class="accent">함께 진화하는 실행 시스템</span></div></div><figure><img src="${images.hero}" alt="사람의 작업 흔적이 재사용 가능한 카드와 규칙으로 조직되는 장면"><figcaption>신호를 발견하고 다음 실행의 자산으로 조직한다</figcaption></figure></div>`,
    visual: "paper",
    duration: 75,
    notes: {
      summary: "에이전틱 셰이핑은 AI에게 답을 더 잘 쓰라고 주문하는 기법이 아니라, 함께 일하는 방식이 점점 나에게 맞아지는 방법입니다.",
      steps: [
        "좋은 동료는 지시받은 일만 끝내지 않습니다. 내가 반복해서 고치는 부분을 눈치채고, 다음에는 먼저 준비해 둡니다. Agent도 그렇게 일하게 만드는 겁니다.",
        "예를 들어 ‘파일명은 늘 이 형식’이면 규칙으로, ‘이 오류는 초기에 잡아야 한다’면 검증기로, ‘이 말투가 좋다’면 기억과 체크리스트로 바꿉니다.",
        "중요한 건 저장했다는 보고가 아닙니다. 다음 작업을 시작할 때 실제로 먼저 찾아 적용해야 합니다. 그때부터 단순한 기억이 아니라 일하는 방식의 진화가 됩니다.",
      ],
    },
  },
  {
    id: "loop",
    section: "HOW",
    title: "작동 루프 | 신호를 재사용 가능한 자산으로",
    kicker: "DETECT → REPEAT",
    body: `<div class="loop-layout"><figure><img src="${images.loop}" alt="관찰과 구조화가 순환하며 연결되는 시각적 루프"></figure><ol class="loop-steps"><li><b>Detect</b><span>반복·교정·실패를 감지</span></li><li><b>Capture</b><span>원인과 판단 기준을 포착</span></li><li><b>Structure</b><span>기억·규칙·스키마로 정형화</span></li><li><b>Apply</b><span>다음 실행 전에 먼저 적용</span></li><li><b>Verify</b><span>파일·화면·런타임으로 확인</span></li><li><b>Simplify / Measure</b><span>재설명·누락·재시도를 줄임</span></li></ol></div>`,
    visual: "paper",
    duration: 85,
    notes: {
      summary: "한 번 메모해 두는 것만으로는 부족합니다. 발견한 기준이 다음 작업에서 실제로 쓰이고, 좋아졌는지 확인돼야 한 바퀴가 완성됩니다.",
      steps: [
        "첫째, ‘또 설명했네’, ‘또 마지막에 발견했네’라는 순간을 신호로 봅니다. 그냥 고치는 데서 멈추지 않고 왜 반복됐는지를 묻습니다.",
        "둘째, 답을 다음에도 꺼내 쓸 모양으로 만듭니다. 팀 회의의 좋은 메모가 다음 회의의 체크리스트가 되는 것과 같습니다.",
        "셋째, 다음 작업에서 정말 먼저 적용됐는지, 재설명과 재시도가 줄었는지 확인합니다. 이 확인까지 있어야 셰이핑 한 바퀴가 닫힙니다.",
      ],
    },
  },
  {
    id: "assets",
    section: "HOW",
    title: "무엇이 무엇으로 바뀌는가",
    kicker: "신호 → 자산",
    body: `<div class="transform-list"><div><span>“앞으로는 이렇게 해줘”</span><b>→</b><strong>기억 · 체크리스트 · 루브릭</strong></div><div><span>반복되는 데이터와 입력</span><b>→</b><strong>타입 · 스키마 · enum · 매니페스트</strong></div><div><span>매번 손으로 하는 순서</span><b>→</b><strong>템플릿 · 명령 · API · 파이프라인</strong></div><div><span>늦게 발견되는 같은 실패</span><b>→</b><strong>불변식 · 조기 검증기 · 회귀 fixture</strong></div></div>`,
    visual: "dark",
    duration: 75,
    notes: {
      summary: "모든 배움을 메모장 하나에 넣지 않습니다. 무엇을 배웠느냐에 따라 다음에 쓸 도구도 달라집니다.",
      steps: [
        "‘이런 톤이 좋다’처럼 사람의 판단이 필요한 것은 기억과 체크리스트가 어울립니다. 다음 Agent가 맥락을 읽고 선택하게 하는 겁니다.",
        "주소나 상태값처럼 모양이 반복되는 것은 스키마가, 매번 같은 순서로 하는 일은 명령이나 파이프라인이 더 잘 맡습니다.",
        "같은 실패가 반복된다면 경고문을 길게 쓰기보다 출발 전에 멈추게 하는 검증기가 낫습니다. 배움을 알맞은 도구에 담는 것이 핵심입니다.",
      ],
    },
  },
  {
    id: "scenario",
    section: "MOMENT",
    title: "한 번의 교정이 다음 작업을 바꾸는 순간",
    kicker: "작은 사례",
    body: `<div class="scenario-flow"><div class="speech">“한국어 슬라이드에서<br><b>어절이 중간에 끊기면 안 돼.</b>”</div><div class="scenario-arrow">↓</div><div class="scenario-track"><span><i>1</i>원인 포착<br><small>브라우저 기본 줄바꿈</small></span><span><i>2</i>계약화<br><small>keep-all + 의미 단위</small></span><span><i>3</i>검증기<br><small>전 장표 overflow 0</small></span><span><i>4</i>다음 적용<br><small>시작 전 자동 회상</small></span></div></div>`,
    visual: "paper",
    duration: 85,
    notes: {
      summary: "작은 피드백 하나가 다음 작업 전체를 바꿀 수 있습니다. ‘한글 단어를 중간에서 끊지 마세요’라는 한마디를 예로 들어보겠습니다.",
      steps: [
        "보통은 깨진 문장 몇 개에 줄바꿈을 넣고 끝냅니다. 그러면 오늘 자료는 괜찮아도 다음 슬라이드에서 같은 문제가 다시 생깁니다.",
        "셰이핑은 ‘왜 끊겼지?’를 묻습니다. 브라우저의 줄바꿈 규칙이 원인이라면 한글 어절 유지와 넘침 0건을 전체 자료의 품질 계약으로 바꿉니다.",
        "다음 발표자료에서는 사용자가 말하기 전에 그 계약이 적용되고, 모든 장표를 검사합니다. 한 번의 불만이 다음 작업의 기본 품질이 되는 순간입니다.",
      ],
    },
  },
  {
    id: "not-memory",
    section: "BOUNDARY",
    title: "기억을 더 많이 쌓는 일이 아니다",
    kicker: "중요한 경계",
    body: `<div class="boundary"><div class="yes"><small>남겨야 하는 것</small><p>반복되는 판단 기준</p><p>검증된 원인과 성공 조건</p><p>재사용 가능한 작업 계약</p></div><div class="no"><small>남기지 않는 것</small><p>민감 정보와 자격 증명</p><p>일회성 상태와 임시 로그</p><p>확인되지 않은 추측</p></div><div class="rule">현재 요청과 권한이 항상 기억보다 우선</div></div>`,
    visual: "olive",
    duration: 65,
    notes: {
      summary: "그렇다고 모든 대화와 정보를 기억시키자는 이야기는 아닙니다. 냉장고에 모든 물건을 넣지 않는 것처럼, 남길 것과 버릴 것을 가려야 합니다.",
      steps: [
        "다음에도 쓸 판단 기준과 확인된 실패 원인은 남길 가치가 있습니다. 반대로 비밀번호, 임시 로그, 오늘만 필요한 상태, 확인하지 않은 추측은 남기면 안 됩니다.",
        "그리고 과거에 좋아했던 방식이라도 오늘 사용자가 다르게 요청하면 오늘 요청이 우선입니다. 기억은 명령권자가 아니라 참고 자산입니다.",
        "목표는 기억을 많이 모으는 것이 아닙니다. 필요한 순간에 맞는 기준이 먼저 나오고, 불필요하거나 위험한 정보는 남지 않는 상태가 목표입니다.",
      ],
    },
  },
  {
    id: "boundary",
    section: "BOUNDARY",
    title: "사람과 자동화 사이의 책임 경계",
    kicker: "JUDGMENT DESIGN",
    body: `<div class="responsibility"><div><small>사람 + Agent</small><strong>의미 · 맥락 · 모호성 · 창의성</strong><span>무엇이 좋은가를 판단하고 선택</span></div><div class="divider"><i></i><b>↔</b><i></i></div><div><small>결정론적 시스템</small><strong>형식 · 타입 · 불변식 · 실행 순서</strong><span>기계 판정 가능한 것을 빠르게 검증</span></div></div>`,
    visual: "paper",
    duration: 65,
    notes: {
      summary: "에이전틱 셰이핑은 판단을 전부 기계에 넘기는 방법도 아닙니다. 셰프가 맛을 보고, 저울과 타이머가 반복을 지키는 것에 가깝습니다.",
      steps: [
        "무슨 이야기가 더 설득력 있는지, 이 표현이 우리답게 느껴지는지는 사람과 Agent가 맥락을 보며 판단합니다. 이것이 셰프의 영역입니다.",
        "반면 파일 형식, 허용 값, 실행 순서, 화면 밖으로 글자가 넘쳤는지는 코드가 더 정확합니다. 이것이 저울과 타이머의 영역입니다.",
        "둘을 섞지 않으면 Agent는 의미 있는 판단에 집중하고, 사람은 매번 같은 형식과 오류를 확인하는 일에서 벗어납니다.",
      ],
    },
  },
  {
    id: "scale",
    section: "SCALE",
    title: "큰 작업일수록 작은 증거 묶음이 필요하다",
    kicker: "SHAPED CONTEXT",
    body: `<div class="image-split reverse"><figure><img src="${images.system}" alt="큰 원문과 여러 정형 자산이 하나의 검증 가능한 시스템으로 연결되는 장면"><figcaption>원문은 권위로, 분석 결과는 추적 가능한 작은 표면으로</figcaption></figure><div class="copy"><p class="definition">문서와 코드가 커질수록 매번 전체를 다시 읽지 않는다.</p><ul class="clean-list"><li>기존 검색·파서·테스트를 먼저 재사용</li><li>부족한 부분만 인벤토리·그래프·검증기로 구조화</li><li>원문 위치·버전·해시에 추적 가능하게 유지</li><li>현재 질문에 필요한 근거만 Agent에 제공</li></ul></div></div>`,
    visual: "paper",
    duration: 75,
    notes: {
      summary: "자료가 커질수록 전부 읽히는 것이 답처럼 보이지만, 사실 도서관의 모든 책을 한꺼번에 책상에 올리는 것과 같습니다.",
      steps: [
        "책이 많을 때 필요한 것은 더 큰 책상이 아니라 좋은 사서와 색인입니다. 코드와 문서도 먼저 기존 검색, 파서, 테스트로 필요한 위치를 찾습니다.",
        "찾기 어려운 부분만 목록과 관계 지도로 만들고, 반드시 원문의 위치와 버전에 연결해 오래된 요약이 진실인 척하지 못하게 합니다.",
        "그러면 Agent는 매번 전체를 삼키지 않고 지금 질문에 필요한 몇 장의 근거만 받습니다. 이 작은 증거 묶음이 큰 작업을 다루는 셰이핑입니다.",
      ],
    },
  },
  {
    id: "proof",
    section: "PROOF",
    title: "그럴듯한 문구보다 행동 증거",
    kicker: "평가 계약",
    body: `<div class="evidence"><div class="metric"><small>고유 행동 완전 통과</small><span><b>16</b>/26</span><i>기본군</i></div><div class="metric accent-metric"><small>고유 행동 완전 통과</small><span><b>25</b>/26</span><i>적용군</i></div><div class="evidence-text"><p>동일한 짝 시나리오 · GPT-5.6 Luna Max 단일 실행</p><p><strong>현재 작업 완료:</strong> 양쪽 27/27</p><p><strong>금지 행동:</strong> 양쪽 0건</p><small>표본·모델·고정 세트의 한계까지 함께 공개</small></div></div>`,
    visual: "dark",
    duration: 75,
    notes: {
      summary: "여기까지 들으면 ‘말은 좋은데 정말 행동이 달라지나요?’라는 질문이 생깁니다. 그래서 같은 과제를 두 방식에 맡겨 비교했습니다.",
      steps: [
        "같은 26개 상황에서 기본 방식은 16개, 셰이핑을 적용한 방식은 25개가 ‘다음 실행까지 개선하는 행동’을 끝까지 수행했습니다.",
        "중요한 것은 점수만 높인 게 아니라는 점입니다. 당장 맡긴 일의 완료는 양쪽 모두 27개를 통과했고, 하면 안 되는 행동도 양쪽 모두 0건이었습니다.",
        "물론 이 숫자가 모든 모델과 상황을 보장하지는 않습니다. 특정 모델과 고정된 사례의 한 번의 결과입니다. 그래서 문구보다 같은 행동 시험을 계속 돌리는 태도가 더 중요합니다.",
      ],
    },
    sources: ["README.ko.md — 공개 평가 결과", "evals/activation-latest-results.json — 짝 시나리오 결과"],
  },
  {
    id: "adopt",
    section: "START",
    title: "오늘 한 작업으로 시작하는 도입 순서",
    kicker: "15분 실험",
    body: `<div class="adopt"><div><b>오늘</b><strong>반복되는 교정 하나를 고른다</strong><span>말투 · 형식 · 실패 조건 · 완료 기준</span></div><div><b>이번 작업</b><strong>원인과 기준을 자산으로 만든다</strong><span>기억 · 체크리스트 · 스키마 · 검증기</span></div><div><b>다음 작업</b><strong>먼저 찾아 적용하고 차이를 잰다</strong><span>재설명 · 누락 · 재시도 · 시간</span></div></div>`,
    visual: "paper",
    duration: 70,
    notes: {
      summary: "‘좋아 보이는데 어디서부터 하지?’ 싶다면 시스템부터 만들지 마세요. 오늘 반복한 말 한마디면 충분합니다.",
      steps: [
        "오늘 AI에게 두 번 이상 한 말을 떠올려 보세요. ‘표로 주세요’, ‘경고를 없애 주세요’, ‘이 톤은 너무 광고 같아요’처럼 작고 분명한 말이면 좋습니다.",
        "그 말을 현재 결과 수정으로 끝내지 말고, 왜 반복됐는지와 다음부터 먼저 적용할 기준을 하나의 기억이나 체크리스트로 만듭니다.",
        "다음 작업에서 내가 말하기 전에 적용됐는지 확인해 보세요. 재설명이 한 번만 줄어도 에이전틱 셰이핑의 가치를 바로 체감할 수 있습니다.",
      ],
    },
  },
  {
    id: "prompt",
    section: "START",
    title: "바로 붙여 넣을 시작 문장",
    kicker: "TRY THIS",
    body: `<div class="starter"><p>“이 작업에 Agentic Shaping을 적용해줘.</p><p>시작 전에 관련된 내 결정과 프로젝트 규칙을 먼저 찾아 실제 결과에 반영하고, 반복되는 판단이나 실패 조건이 보이면 다음 작업에서 재사용할 수 있는 기억·타입·검증기·테스트로 승격해줘.</p><p>현재 요청과 권한을 넓히지 말고, 실제 파일·화면·런타임으로 완료를 확인해줘.”</p></div><button class="copy-prompt" type="button" data-copy-prompt>문장 복사</button>`,
    visual: "olive",
    duration: 65,
    notes: {
      summary: "처음 시도할 때는 이 문장을 그대로 붙여 넣으셔도 됩니다. 핵심은 오늘 일과 다음 일을 따로 놓치지 않는 것입니다.",
      steps: [
        "첫 부분은 ‘전에 합의한 것을 먼저 찾아 실제 결과에 써 달라’는 요청입니다. 기억을 읽었다는 보고가 아니라 결과에 반영하라는 뜻입니다.",
        "가운데 부분은 반복되는 판단과 실패를 발견하면 다음에도 쓸 수 있는 기억, 규칙, 검증기 중 알맞은 형태로 바꾸라는 요청입니다.",
        "마지막 부분은 권한을 멋대로 넓히지 말고 실제 파일과 화면으로 오늘 일을 끝냈는지 확인하라는 안전장치입니다. 이 세 가지가 함께 있어야 합니다.",
      ],
    },
  },
  {
    id: "q-long-memory",
    section: "Q&A",
    title: "Q1 | 장기기억과 무엇이 다른가?",
    kicker: "기억은 재료, 셰이핑은 변화",
    body: `<div class="qa-compare"><div><small>장기기억</small><strong>과거의 정보와 결정을<br>저장하고 다시 꺼낸다</strong><span>“무엇을 기억하고 있지?”</span></div><div class="qa-versus">→</div><div class="shaping"><small>Agentic Shaping</small><strong>작업 중 배운 기준으로<br>다음 실행의 방식을 바꾼다</strong><span>“다음에는 무엇을 다르게 할까?”</span></div><p>장기기억은 Agentic Shaping이 사용할 수 있는 여러 자산 중 하나</p></div>`,
    visual: "paper",
    duration: 65,
    notes: {
      summary: "장기기억이 ‘잊지 않는 것’이라면, 에이전틱 셰이핑은 ‘기억한 것을 이용해 다음 행동을 바꾸는 것’입니다.",
      steps: [
        "예를 들어 AI가 제가 짧은 제목을 좋아한다는 사실을 기억하고 있다면 장기기억은 잘 작동한 겁니다. 하지만 다음 발표에서도 긴 제목을 만들고 나중에야 그 기억을 꺼낸다면 일하는 방식은 그대로입니다.",
        "에이전틱 셰이핑은 그 선호를 작업 시작 전에 먼저 회상하고, 제목 생성 규칙과 검사 기준에 반영해 처음부터 다른 결과를 만듭니다.",
        "그래서 기억은 중요한 재료지만 전부는 아닙니다. 기억이 없어도 규칙·스키마·검증기로 셰이핑할 수 있고, 기억이 있어도 적용과 검증이 없으면 셰이핑이라고 부르기 어렵습니다.",
      ],
    },
    sources: ["README.ko.md — 정의와 Structure 단계", "README.ko.md — 모든 것을 기억하게 만드는 것이 아니라는 경계"],
  },
  {
    id: "q-llm-wiki",
    section: "Q&A",
    title: "Q2 | LLM Wiki와 무엇이 다른가?",
    kicker: "도서관과 일하는 방법",
    body: `<div class="wiki-relationship"><div class="wiki-box"><small>LLM WIKI · 기억 인프라</small><strong>저장 · 검색 · 회상 · 범위 · 근거 · 갱신</strong><span>필요한 기억을 오래 보존하고 다시 찾는다</span></div><div class="relation-arrows"><b>기억 자산 제공</b><i>⇄</i><b>작업 결과로 갱신</b></div><div class="shaping-box"><small>AGENTIC SHAPING · 작업 방법론</small><strong>감지 · 포착 · 구조화 · 적용 · 검증 · 개선</strong><span>기억을 포함한 자산으로 다음 실행을 바꾼다</span></div><p><b>LLM Wiki 없이도</b> 셰이핑할 수 있고, <b>셰이핑 없이도</b> LLM Wiki는 기억을 저장할 수 있다</p></div>`,
    visual: "dark",
    duration: 65,
    notes: {
      summary: "LLM Wiki가 지식을 보관하고 찾아주는 도서관이라면, Agentic Shaping은 무엇을 책으로 만들고 언제 꺼내 실제 일에 쓸지 결정하는 작업 방식입니다.",
      steps: [
        "LLM Wiki의 역할은 분명합니다. 교정과 결정의 범위를 나눠 저장하고, 관련 기억을 검색·회상하며, 근거를 보존한 채 갱신하는 기억 인프라입니다.",
        "에이전틱 셰이핑은 그보다 넓습니다. 작업 중 어떤 신호를 포착할지, 기억으로 둘지 검증기로 만들지, 다음 실행 어디에 적용하고 무엇으로 확인할지를 다룹니다.",
        "둘은 대체 관계가 아니라 결합 관계입니다. LLM Wiki는 셰이핑에 좋은 기억 기반을 제공하고, 셰이핑은 LLM Wiki의 기억이 실제 행동으로 이어지게 만듭니다.",
      ],
    },
    sources: ["README.ko.md — LLM Wiki와 함께 사용하기", "Slogs LLM Wiki 정책 — 작업 전 회상과 적용·검증 계약"],
  },
  {
    id: "q-one-line",
    section: "Q&A",
    title: "Q3 | 한 문장으로 말하면?",
    kicker: "가장 짧은 정의",
    body: `<div class="one-line-answer"><p>Agentic Shaping은</p><blockquote>“오늘의 교정을<br><em>내일의 기본값</em>으로 바꾸는<br>AI 작업법”</blockquote><div class="answer-depth"><span><b>기억만?</b> 적용과 검증까지</span><span><b>코딩만?</b> 문서·분석·창작·배포까지</span><span><b>자동화만?</b> 의미 판단은 Agent에게</span></div></div>`,
    visual: "olive",
    duration: 55,
    notes: {
      summary: "가장 짧게는 ‘오늘의 교정을 내일의 기본값으로 바꾸는 AI 작업법’이라고 소개하시면 됩니다.",
      steps: [
        "조금 더 풀면, AI가 일할수록 내 기준을 배우고 그 배움을 기억·규칙·도구·검증기로 바꿔 다음 실행에 먼저 쓰게 하는 방법입니다.",
        "여기서 ‘교정’은 불만만 뜻하지 않습니다. 마음에 든 선택, 반복한 판단, 늦게 발견한 실패, 완료라고 느낀 기준도 모두 다음 실행을 바꾸는 신호입니다.",
        "그래서 누군가 ‘그게 그냥 장기기억 아닌가요?’라고 물으면 이렇게 답하면 됩니다. 기억은 재료이고, 셰이핑은 그 재료로 실제 일하는 방식을 바꾸고 확인하는 전체 과정입니다.",
      ],
    },
    sources: ["README.ko.md — 첫 문장 정의", "Agentic Shaping 작동 순환 — Detect부터 Simplify/Measure까지"],
  },
  {
    id: "q-quality",
    section: "Q&A",
    title: "Q4 | 매번 같은 품질을 보장하는가?",
    kicker: "복제가 아니라 편차 관리",
    body: `<div class="quality-answer"><div class="quality-no"><small>짧은 답</small><strong>아니요.<br>완전히 같은 결과를 보장하지는 않는다.</strong></div><div class="quality-axis"><span><b>달라질 수 있는 것</b>모델 · 맥락 · 도구 · 환경 · 창의적 판단</span><i>하지만</i><span><b>안정화할 수 있는 것</b>규칙 · 스키마 · 검증기 · 회귀 평가 · 실제 결과 확인</span></div><p><del>같은 결과의 복제</del><b>품질 하한을 높이고 편차를 조기에 발견</b></p></div>`,
    visual: "paper",
    duration: 65,
    notes: {
      summary: "아니요. 에이전틱 셰이핑은 매번 동일한 품질을 보장하지 않습니다. 똑같은 결과를 찍는 복사기가 아니라, 품질의 하한을 높이고 나빠진 순간을 빨리 알아채는 방법입니다.",
      steps: [
        "같은 요청도 모델 버전, 제공된 맥락, 사용할 수 있는 도구, 실행 환경, 창의적 선택에 따라 달라질 수 있습니다. 이 변동을 없다고 말하면 오히려 위험합니다.",
        "대신 바뀌면 안 되는 것은 기억과 규칙으로, 형식은 스키마로, 반복 실패는 검증기와 회귀 사례로 고정합니다. 그러면 결과가 달라도 중요한 기준을 놓쳤는지는 빨리 판정할 수 있습니다.",
        "따라서 목표는 모든 결과를 같게 만드는 것이 아닙니다. 허용 가능한 품질 범위를 분명히 하고, 그 아래로 내려가면 조기에 실패시키며, 여러 실행에서 편차가 실제로 줄었는지 측정하는 것입니다.",
      ],
    },
    sources: ["README.ko.md — 검증과 공개 평가의 한계", "Agentic Shaping 정책 — 특정 모델·도구 환경의 통과를 보편적 보장으로 과장하지 않는 계약"],
  },
  {
    id: "close",
    section: "ACTION",
    title: "다음 요청 하나를, 진화의 첫 입력으로",
    kicker: "THE NEXT RUN",
    body: `<div class="closing"><p>한 번 더 잘 답하는 AI가 아니라</p><strong>함께 일할수록<br><em>내 방식으로 진화하는 시스템</em></strong><div class="closing-line"><span>오늘의 교정</span><b>→</b><span>내일의 기본값</span></div></div>`,
    visual: "title",
    duration: 50,
    notes: {
      summary: "오늘 기억하실 것은 하나입니다. 방금 한 교정을 오늘의 수정으로 끝내지 말고, 내일의 기본값으로 바꿔 보세요.",
      steps: [
        "AI에게 무조건 나를 기억하라고 말하는 것이 핵심은 아닙니다. 좋은 결과를 만든 이유를 다음에도 쓸 수 있는 모양으로 남기는 것이 핵심입니다.",
        "그리고 다음 실행에서 정말 먼저 적용됐는지, 내가 같은 말을 덜 했는지 확인해 보세요. 그 작은 차이가 쌓이면 협업 방식이 달라집니다.",
        "여러분이 이 발표 뒤에 보낼 다음 요청 하나를 첫 실험으로 삼아 보시면 좋겠습니다. AI가 답을 주는 도구에서 함께 진화하는 작업 시스템으로 바뀌는 출발점입니다.",
      ],
    },
  },
];

const deckSources = [
  "Agentic Shaping README.ko.md — 정의, 작동 루프, 공개 평가 수치",
  "Slogs LLM Wiki private memory — HTML 발표자료와 N 3상태 발표자창 계약",
  "assets/agentic-shaping-*.jpg — 프로젝트 소유 AI 생성 비주얼",
];

const slideJson = JSON.stringify(slides).replaceAll("</script>", "<\\/script>");
const sourceJson = JSON.stringify(deckSources).replaceAll("</script>", "<\\/script>");

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="color-scheme" content="dark light">
  <title>Agentic Shaping — 커뮤니티 소개</title>
  <style>
    :root{--ink:#17201d;--paper:#f4f0e7;--cream:#fffaf0;--green:#173e32;--lime:#bedb39;--orange:#f47a31;--muted:#7f857b;--line:rgba(23,32,29,.18);font-family:"Noto Sans KR","Pretendard","Malgun Gothic",system-ui,sans-serif;color:var(--ink);background:#0e1512}
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{word-break:keep-all;overflow-wrap:normal;background:#0e1512}
    button{font:inherit}button:focus-visible{outline:3px solid var(--lime);outline-offset:3px}
    #stage{position:fixed;inset:0;display:grid;place-items:center;background:radial-gradient(circle at 30% 20%,#22342d,#0d1411 60%)}
    #deck{position:relative;width:min(100vw,calc(100vh * 16 / 9));height:min(100vh,calc(100vw * 9 / 16));overflow:hidden;background:var(--paper);box-shadow:0 30px 80px #0008}
    .slide{position:absolute;inset:0;padding:5.3% 6.2% 4.2%;display:none;overflow:hidden;background:var(--paper)}.slide.active{display:block;animation:enter .38s cubic-bezier(.2,.8,.2,1)}
    @keyframes enter{from{opacity:.2;transform:translateY(10px)}to{opacity:1;transform:none}}
    .slide.dark{color:var(--paper);background:var(--ink)}.slide.olive{color:var(--paper);background:#26382a}.slide.title{color:var(--paper);background:linear-gradient(125deg,#10251e 0 55%,#254d3b 100%)}
    .slide.title:after{content:"";position:absolute;width:46%;aspect-ratio:1;border-radius:50%;right:-16%;top:-34%;border:1px solid #bedb3955;box-shadow:0 0 0 42px #bedb3910,0 0 0 84px #bedb3908}
    .topline{display:flex;align-items:center;justify-content:space-between;gap:2rem;margin-bottom:2.4%;position:relative;z-index:2}.kicker{font:700 clamp(11px,1vw,18px)/1 "DM Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--orange)}.section{font:600 clamp(10px,.8vw,15px)/1 "DM Mono",monospace;letter-spacing:.14em;color:currentColor;opacity:.58}
    h1{position:relative;z-index:2;font-size:clamp(30px,3.4vw,65px);line-height:1.08;letter-spacing:-.052em;margin:0 0 2.8%;max-width:86%;font-weight:850}.slide.title h1{max-width:72%;font-size:clamp(36px,4.1vw,78px)}
    .content{height:72%;position:relative;z-index:2}.footer{position:absolute;z-index:3;left:6.2%;right:6.2%;bottom:2.5%;display:flex;align-items:center;gap:1rem;font:600 clamp(9px,.75vw,14px)/1 "DM Mono",monospace;letter-spacing:.08em}.footer .rule{height:1px;flex:1;background:currentColor;opacity:.22}.footer .hint{opacity:.55}.slide.title .footer,.slide.dark .footer,.slide.olive .footer{color:var(--paper)}
    .hero-line{font-size:clamp(22px,2.45vw,47px);line-height:1.28;font-weight:650;margin:2.5% 0 0;max-width:72%;letter-spacing:-.035em}.hero-line em{font-style:normal;color:var(--lime)}.hero-sub{font-size:clamp(13px,1.15vw,22px);margin-top:3%;opacity:.72}.title-copy:after{content:"";display:block;width:18%;height:8px;margin-top:3.5%;background:var(--orange)}
    .quote-stage{height:100%;display:grid;align-content:center;justify-items:center;text-align:center}.quote-stage>p{font-size:clamp(27px,3.3vw,63px);font-weight:800;line-height:1.28;letter-spacing:-.05em;margin:-4% 0 6%}.repeat-line{display:flex;align-items:center;gap:1.25rem;font-size:clamp(16px,1.45vw,28px)}.repeat-line span{border-bottom:2px solid #f4f0e766;padding:.45em}.repeat-line .fade{opacity:.35}.repeat-line b{color:var(--orange)}
    .leak-map{height:100%;display:grid;grid-template-columns:1.25fr .8fr .9fr;align-items:center;gap:3%}.leak-map>div{padding:7%;border-top:5px solid var(--green)}.leak-map small{display:block;font-size:clamp(12px,1vw,19px);letter-spacing:.12em;color:var(--muted);margin-bottom:1.2rem}.leak-map strong{font-size:clamp(20px,2vw,38px);line-height:1.45}.leak-arrow{display:grid;place-items:center;text-align:center;border:0!important}.leak-arrow i{width:100%;height:2px;background:linear-gradient(90deg,var(--green),transparent);position:relative;margin-top:1rem}.leak-arrow i:after{content:"";position:absolute;right:0;top:-6px;border:7px solid transparent;border-left-color:var(--orange)}.archive{background:#fff8ea}.archive span{display:block;margin-top:1rem;color:#a04c20;font-size:clamp(13px,1vw,20px)}
    .image-split{height:100%;display:grid;grid-template-columns:1fr 1.04fr;gap:5%;align-items:center}.image-split.reverse{grid-template-columns:1.08fr .92fr}.image-split figure{height:100%;margin:0;position:relative;overflow:hidden;background:#ddd}.image-split figure img{width:100%;height:100%;object-fit:cover}.image-split figcaption{position:absolute;left:0;right:0;bottom:0;padding:1.2rem;color:white;background:linear-gradient(transparent,#000b);font-size:clamp(10px,.8vw,15px)}.definition{font-size:clamp(18px,1.65vw,32px);line-height:1.55;letter-spacing:-.025em}.definition b{color:#235b47}.before-after{margin-top:9%;display:flex;align-items:center;gap:1rem;font-size:clamp(13px,1vw,20px)}.before-after b{color:var(--orange)}.before-after .accent{font-weight:800;border-bottom:5px solid var(--lime)}
    .loop-layout{height:100%;display:grid;grid-template-columns:.92fr 1.08fr;gap:5%;align-items:center}.loop-layout figure{margin:0;height:100%;overflow:hidden}.loop-layout img{width:100%;height:100%;object-fit:cover}.loop-steps{list-style:none;margin:0;padding:0;counter-reset:item}.loop-steps li{display:grid;grid-template-columns:1.1fr 2fr;align-items:baseline;padding:2.5% 0;border-bottom:1px solid var(--line)}.loop-steps b{font-size:clamp(16px,1.35vw,26px);color:var(--green)}.loop-steps span{font-size:clamp(12px,1vw,19px)}
    .transform-list{height:100%;display:grid;align-content:center;gap:0}.transform-list>div{display:grid;grid-template-columns:1.08fr .18fr 1.45fr;align-items:center;padding:2.4% 2%;border-top:1px solid #f4f0e733}.transform-list>div:last-child{border-bottom:1px solid #f4f0e733}.transform-list span{font-size:clamp(14px,1.3vw,25px)}.transform-list b{font-size:clamp(20px,1.7vw,34px);color:var(--orange)}.transform-list strong{font-size:clamp(17px,1.5vw,29px);color:var(--lime)}
    .scenario-flow{height:100%;display:grid;grid-template-rows:auto auto 1fr;align-content:center}.speech{justify-self:center;padding:2.2% 4%;font-size:clamp(19px,2vw,38px);line-height:1.5;text-align:center;background:white;border:1px solid var(--line);box-shadow:10px 10px 0 #bedb3955}.speech b{color:var(--green)}.scenario-arrow{text-align:center;color:var(--orange);font-size:clamp(22px,2vw,38px);padding:1.5%}.scenario-track{display:grid;grid-template-columns:repeat(4,1fr);gap:2%}.scenario-track span{padding:8% 7%;font-size:clamp(14px,1.2vw,23px);font-weight:800;border-top:5px solid var(--green);background:#fff9ee}.scenario-track i{display:block;font-style:normal;color:var(--orange);margin-bottom:.8rem}.scenario-track small{display:block;margin-top:.8rem;font-size:clamp(10px,.8vw,15px);font-weight:500;color:var(--muted)}
    .boundary{height:100%;display:grid;grid-template-columns:1fr 1fr;gap:4%;align-content:center;position:relative}.boundary>div:not(.rule){padding:6%;border-top:6px solid var(--lime);background:#ffffff0d}.boundary .no{border-top-color:var(--orange)!important}.boundary small{display:block;letter-spacing:.13em;margin-bottom:1.5rem;opacity:.65}.boundary p{font-size:clamp(15px,1.4vw,27px);margin:.8em 0}.boundary .rule{grid-column:1/-1;text-align:center;font-size:clamp(15px,1.3vw,25px);font-weight:800;color:var(--lime);margin-top:1.5%}
    .responsibility{height:100%;display:grid;grid-template-columns:1fr .16fr 1fr;align-items:center;text-align:center}.responsibility>div:not(.divider){padding:10% 6%;border-top:6px solid var(--green);background:#fff9ef}.responsibility small{display:block;color:var(--orange);letter-spacing:.13em;margin-bottom:1.4rem}.responsibility strong{display:block;font-size:clamp(20px,2vw,38px);line-height:1.45}.responsibility span{display:block;color:var(--muted);margin-top:1.3rem;font-size:clamp(12px,1vw,19px)}.divider{display:grid;place-items:center}.divider i{display:block;width:1px;height:70px;background:var(--line)}.divider b{font-size:clamp(20px,2vw,38px);color:var(--orange)}
    .clean-list{list-style:none;padding:0;margin:7% 0 0}.clean-list li{padding:3.5% 0 3.5% 1.5em;border-bottom:1px solid var(--line);font-size:clamp(12px,1vw,19px);position:relative}.clean-list li:before{content:"";position:absolute;left:0;top:1.2em;width:.55em;height:.55em;background:var(--orange)}
    .evidence{height:100%;display:grid;grid-template-columns:.82fr .82fr 1.25fr;gap:3%;align-items:center}.metric{padding:10% 8%;text-align:center;border-top:6px solid #f4f0e755;background:#fff1}.metric small{display:block;font-size:clamp(10px,.78vw,15px);opacity:.65}.metric span{display:block;font-size:clamp(28px,3.8vw,72px);margin:.25em 0;font-weight:400}.metric span b{font-size:1.25em}.metric i{font-style:normal;color:var(--orange)}.accent-metric{border-color:var(--lime);background:#bedb3915}.accent-metric span,.accent-metric i{color:var(--lime)}.evidence-text{padding-left:4%;border-left:1px solid #f4f0e733}.evidence-text p{font-size:clamp(12px,1.1vw,21px);line-height:1.55}.evidence-text small{display:block;margin-top:1.5rem;opacity:.55}
    .adopt{height:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:3%;align-items:center}.adopt>div{height:72%;padding:9% 7%;border-top:7px solid var(--green);background:#fff9ee;display:flex;flex-direction:column}.adopt b{color:var(--orange);font-size:clamp(12px,1vw,19px)}.adopt strong{font-size:clamp(18px,1.75vw,33px);line-height:1.38;margin:14% 0 auto}.adopt span{font-size:clamp(11px,.92vw,18px);color:var(--muted);line-height:1.5}
    .starter{font-family:"Noto Sans KR",sans-serif;margin:2% auto 0;max-width:84%;padding:3.2% 4%;border-left:8px solid var(--lime);background:#fff1;box-shadow:0 20px 60px #0002}.starter p{font-size:clamp(15px,1.35vw,26px);line-height:1.65;margin:.6em 0}.copy-prompt{display:block;margin:2% auto 0;border:1px solid #f4f0e755;color:var(--paper);background:transparent;padding:.8em 1.5em;cursor:pointer}.copy-prompt:hover{background:var(--lime);color:var(--ink)}
    .closing{height:100%;display:grid;align-content:center;justify-items:start}.closing>p{font-size:clamp(15px,1.3vw,25px);opacity:.65;margin:0 0 2%}.closing>strong{font-size:clamp(34px,4vw,76px);line-height:1.16;letter-spacing:-.055em}.closing em{font-style:normal;color:var(--lime)}.closing-line{margin-top:4%;display:flex;align-items:center;gap:1.2rem;font-size:clamp(14px,1.2vw,23px)}.closing-line b{color:var(--orange)}
    .qa-compare{height:100%;display:grid;grid-template-columns:1fr auto 1fr;gap:3%;align-items:center}.qa-compare>div:not(.qa-versus){padding:7% 6%;border-top:7px solid var(--green);background:#fff9ee}.qa-compare .shaping{border-color:var(--orange)!important}.qa-compare small{display:block;color:var(--orange);font-weight:800;letter-spacing:.12em;margin-bottom:1.3rem}.qa-compare strong{display:block;font-size:clamp(18px,1.8vw,34px);line-height:1.45}.qa-compare span{display:block;margin-top:1.4rem;color:var(--muted);font-size:clamp(12px,1vw,19px)}.qa-versus{font-size:clamp(24px,2.4vw,46px);color:var(--orange)}.qa-compare>p{grid-column:1/-1;text-align:center;margin:0;font-size:clamp(14px,1.2vw,23px);font-weight:800;color:var(--green)}
    .wiki-relationship{height:100%;display:grid;grid-template-columns:1fr .58fr 1fr;gap:3%;align-items:center}.wiki-box,.shaping-box{padding:8% 6%;border-top:7px solid #f4f0e755}.shaping-box{border-color:var(--lime)}.wiki-relationship small{display:block;color:var(--orange);letter-spacing:.1em;margin-bottom:1.2rem}.wiki-relationship strong{display:block;font-size:clamp(18px,1.75vw,33px);line-height:1.45}.wiki-relationship span{display:block;margin-top:1.3rem;opacity:.66;font-size:clamp(11px,.95vw,18px);line-height:1.5}.relation-arrows{display:grid;justify-items:center;gap:.8rem;text-align:center}.relation-arrows b{font-size:clamp(10px,.8vw,15px);font-weight:600;opacity:.65}.relation-arrows i{font-style:normal;color:var(--lime);font-size:clamp(26px,2.7vw,52px)}.wiki-relationship>p{grid-column:1/-1;text-align:center;margin:0;font-size:clamp(13px,1.1vw,21px);color:var(--lime)}
    .one-line-answer{height:100%;display:grid;align-content:center;justify-items:center;text-align:center}.one-line-answer>p{margin:0;font-size:clamp(14px,1.2vw,23px);opacity:.65}.one-line-answer blockquote{margin:2% 0 4%;font-size:clamp(30px,3.5vw,67px);line-height:1.18;font-weight:850;letter-spacing:-.05em}.one-line-answer em{font-style:normal;color:var(--lime)}.answer-depth{display:flex;gap:2.2rem;flex-wrap:wrap;justify-content:center;padding-top:2%;border-top:1px solid #f4f0e744}.answer-depth span{font-size:clamp(11px,.9vw,17px);opacity:.72}.answer-depth b{color:var(--orange);margin-right:.4rem}
    .quality-answer{height:100%;display:grid;grid-template-columns:.86fr 1.14fr;gap:5%;align-items:center}.quality-no{padding:8% 6%;border-top:8px solid var(--orange);background:#fff9ee}.quality-no small{display:block;color:var(--orange);font-weight:800;letter-spacing:.13em;margin-bottom:1.3rem}.quality-no strong{font-size:clamp(20px,2.1vw,40px);line-height:1.4}.quality-axis{display:grid;gap:1rem}.quality-axis span{padding:4% 0;border-bottom:1px solid var(--line);font-size:clamp(13px,1.1vw,21px);line-height:1.5}.quality-axis span b{display:block;color:var(--green);font-size:clamp(15px,1.35vw,26px);margin-bottom:.5rem}.quality-axis i{text-align:center;font-style:normal;color:var(--orange);font-weight:850}.quality-answer>p{grid-column:1/-1;display:flex;justify-content:center;gap:2rem;align-items:center;margin:0;font-size:clamp(15px,1.35vw,26px)}.quality-answer del{color:var(--muted)}.quality-answer>p b{color:var(--green)}
    #progress{position:absolute;z-index:7;left:0;right:0;bottom:0;height:5px;background:#ffffff22}#progress span{display:block;height:100%;background:var(--orange);transition:width .3s}
    #controls{position:absolute;z-index:8;right:1.4%;bottom:2%;display:flex;gap:.45rem;opacity:.18;transition:opacity .2s}#deck:hover #controls,#controls:focus-within{opacity:1}#controls button{border:1px solid currentColor;border-radius:50%;width:2.2rem;height:2.2rem;background:#0e1512cc;color:white;cursor:pointer}
    #drawer{position:fixed;z-index:30;inset:0 0 0 auto;width:min(42rem,43vw);transform:translateX(102%);transition:transform .28s ease;background:#f8f4ea;color:var(--ink);box-shadow:-20px 0 70px #0007;display:grid;grid-template-rows:auto 1fr}#drawer.open{transform:none}.presenter-toolbar{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;padding:.65rem .8rem;border-bottom:1px solid var(--line);background:#efe9dc;font-size:.76rem}.presenter-toolbar .grow{flex:1}.presenter-toolbar button{border:1px solid #23352e44;background:#fffaf0;padding:.4rem .62rem;cursor:pointer;color:var(--ink)}.presenter-toolbar button:hover{background:var(--lime)}.presenter-body{overflow:auto;padding:clamp(1.2rem,3vw,2.7rem)}.presenter-meta{font:700 .74rem/1 "DM Mono",monospace;letter-spacing:.12em;color:#ad5426}.presenter-title{font-size:clamp(1.55rem,2.2vw,2.35rem);line-height:1.25;margin:.7rem 0 1.4rem}.presenter-summary{font-size:clamp(1.2rem,1.55vw,1.65rem);line-height:1.55;font-weight:800;color:#1f533f}.presenter-steps{padding-left:1.4em;margin-top:1.4rem}.presenter-steps li{font-size:clamp(1.02rem,1.2vw,1.3rem);line-height:1.72;margin:.85rem 0}.presenter-sources{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--line);font-size:.78rem;color:#6d746d;line-height:1.5}
    #toast{position:fixed;z-index:60;left:50%;bottom:2rem;transform:translate(-50%,2rem);padding:.7rem 1rem;background:#17201dee;color:white;opacity:0;transition:.25s;pointer-events:none}#toast.show{opacity:1;transform:translate(-50%,0)}
    #help{position:fixed;z-index:50;inset:0;display:none;place-items:center;background:#000b}#help.open{display:grid}.help-card{width:min(680px,90vw);padding:2rem;background:var(--paper);color:var(--ink)}.help-card h2{font-size:1.7rem;margin-top:0}.keys{display:grid;grid-template-columns:auto 1fr;gap:.65rem 1rem}.keys kbd{font:700 .8rem/1 "DM Mono",monospace;border:1px solid var(--line);padding:.45rem .6rem;background:white;text-align:center}.help-card button{float:right;border:0;background:var(--ink);color:white;padding:.7rem 1rem;cursor:pointer}
    @media(max-width:900px){#drawer{width:min(92vw,42rem)}.slide{padding:6% 5% 5%}.footer{left:5%;right:5%}.hint{display:none}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
  </style>
</head>
<body>
  <main id="stage" aria-label="Agentic Shaping 커뮤니티 발표자료">
    <section id="deck" aria-label="Agentic Shaping 슬라이드" aria-live="polite">
      <div id="slides"></div>
      <div id="progress"><span></span></div>
      <nav id="controls" aria-label="발표 제어"><button type="button" id="prev" aria-label="이전 슬라이드">‹</button><button type="button" id="next" aria-label="다음 슬라이드">›</button><button type="button" id="notes" aria-label="발표자 대사">N</button><button type="button" id="full" aria-label="전체화면">⛶</button></nav>
    </section>
  </main>
  <aside id="drawer" aria-label="발표자 대사" aria-hidden="true" inert>
    <div class="presenter-toolbar"><b id="drawerCount">1 / 18</b><span id="drawerTime">00:00</span><span id="drawerSlideTime">00:45</span><span class="grow"></span><button type="button" data-action="prev">이전</button><button type="button" data-action="next">다음</button><button type="button" data-action="timer">시간 멈춤</button><button type="button" data-action="reset">시간 초기화</button><button type="button" data-action="popup">대사창 분리</button><button type="button" data-action="close">닫기</button></div>
    <div class="presenter-body" id="drawerBody"></div>
  </aside>
  <div id="toast" role="status"></div>
  <div id="help" role="dialog" aria-modal="true" aria-label="단축키 도움말"><div class="help-card"><button type="button" data-close-help>닫기</button><h2>발표 단축키</h2><div class="keys"><kbd>→ / Space</kbd><span>다음 슬라이드</span><kbd>←</kbd><span>이전 슬라이드</span><kbd>N · N</kbd><span>오른쪽 대사 패널 → 별도 발표자 창 → 숨김</span><kbd>F</kbd><span>메인 슬라이드 전체화면</span><kbd>T</kbd><span>시간 멈춤 / 계속</span><kbd>A</kbd><span>자동 재생 시작 / 중지</span><kbd>?</kbd><span>도움말</span><kbd>Esc</kbd><span>패널·도움말 닫기</span></div></div></div>
  <script id="slide-data" type="application/json">${slideJson}</script>
  <script id="deck-sources" type="application/json">${sourceJson}</script>
  <script>
    const slides = JSON.parse(document.getElementById('slide-data').textContent);
    const deckSources = JSON.parse(document.getElementById('deck-sources').textContent);
    const els = {slides:document.getElementById('slides'),progress:document.querySelector('#progress span'),drawer:document.getElementById('drawer'),drawerBody:document.getElementById('drawerBody'),drawerCount:document.getElementById('drawerCount'),drawerTime:document.getElementById('drawerTime'),drawerSlideTime:document.getElementById('drawerSlideTime'),help:document.getElementById('help'),toast:document.getElementById('toast')};
    const state = {index:0,notesMode:'hidden',popup:null,running:true,startedAt:Date.now(),accumulated:0,capturedAt:Date.now(),auto:false,autoHandle:null};
    const escapeHtml = value => String(value).replace(/[&<>\"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]));
    const formatTime = seconds => {const value=Math.max(0,Math.floor(seconds));return String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0')};
    const elapsedSeconds = () => state.accumulated + (state.running ? (Date.now()-state.startedAt)/1000 : 0);
    const noteMarkup = slide => '<div class="presenter-meta">'+escapeHtml(slide.section)+' · '+String(state.index+1).padStart(2,'0')+' / '+slides.length+'</div><h2 class="presenter-title">'+escapeHtml(slide.title)+'</h2><p class="presenter-summary">'+escapeHtml(slide.notes.summary)+'</p><ol class="presenter-steps">'+slide.notes.steps.map(step=>'<li>'+escapeHtml(step)+'</li>').join('')+'</ol>'+(slide.sources?.length?'<div class="presenter-sources"><b>[Sources]</b><br>'+slide.sources.map(escapeHtml).join('<br>')+'</div>':'');
    els.slides.innerHTML = slides.map((slide,index)=>'<section class="slide '+slide.visual+'" data-index="'+index+'" aria-label="'+escapeHtml(slide.title)+'"><div class="topline"><span class="kicker">'+escapeHtml(slide.kicker)+'</span><span class="section">'+escapeHtml(slide.section)+'</span></div><h1>'+escapeHtml(slide.title)+'</h1><div class="content">'+slide.body+'</div><div class="footer"><span>'+String(index+1).padStart(2,'0')+'</span><span class="rule"></span><span class="hint">N · N 발표자창 &nbsp; F 전체화면 &nbsp; ? 도움말</span></div></section>').join('');
    function snapshot(){return {type:'state',index:state.index,slide:slides[state.index],count:slides.length,elapsed:elapsedSeconds(),running:state.running,capturedAt:Date.now(),auto:state.auto}}
    function sendPopup(){if(state.popup&&!state.popup.closed)state.popup.postMessage(snapshot(),'*')}
    function updatePresenter(){const slide=slides[state.index];els.drawerBody.innerHTML=noteMarkup(slide);els.drawerCount.textContent=(state.index+1)+' / '+slides.length;els.drawerSlideTime.textContent=formatTime(slide.duration);els.drawer.querySelector('[data-action="timer"]').textContent=state.running?'시간 멈춤':'시간 계속';sendPopup()}
    function scheduleAuto(){clearTimeout(state.autoHandle);if(!state.auto)return;state.autoHandle=setTimeout(()=>{if(state.index<slides.length-1)go(state.index+1);else toggleAuto(false)},slides[state.index].duration*1000)}
    function go(index){state.index=Math.max(0,Math.min(slides.length-1,index));document.querySelectorAll('.slide').forEach((slide,i)=>slide.classList.toggle('active',i===state.index));els.progress.style.width=((state.index+1)/slides.length*100)+'%';updatePresenter();scheduleAuto();history.replaceState(null,'','#'+slides[state.index].id)}
    function setNotesMode(mode){state.notesMode=mode;const drawerOpen=mode==='drawer';els.drawer.classList.toggle('open',drawerOpen);els.drawer.setAttribute('aria-hidden',drawerOpen?'false':'true');els.drawer.inert=!drawerOpen;if(mode==='popup')openPopup();if(mode==='hidden'&&state.popup&&!state.popup.closed){state.popup.close();state.popup=null}}
    function cycleNotes(){if(state.notesMode==='hidden')setNotesMode('drawer');else if(state.notesMode==='drawer')setNotesMode('popup');else setNotesMode('hidden')}
    function openPopup(){els.drawer.classList.remove('open');els.drawer.setAttribute('aria-hidden','true');els.drawer.inert=true;if(state.popup&&!state.popup.closed){state.popup.focus();sendPopup();return}state.popup=window.open('','agentic-shaping-presenter','popup=yes,width=980,height=760,resizable=yes,scrollbars=yes');if(!state.popup){state.notesMode='drawer';els.drawer.classList.add('open');els.drawer.setAttribute('aria-hidden','false');els.drawer.inert=false;toast('팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.');return}state.popup.document.write(popupDocument());state.popup.document.close();setTimeout(sendPopup,80)}
    function popupDocument(){return \`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Agentic Shaping · 발표자 대사</title><style>:root{font-family:"Noto Sans KR","Malgun Gothic",sans-serif;color:#17201d;background:#f4f0e7}*{box-sizing:border-box}html,body{margin:0;min-height:100%;word-break:keep-all;overflow-wrap:normal}body{display:grid;grid-template-rows:auto 1fr}.bar{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;padding:.65rem .8rem;background:#eae3d5;border-bottom:1px solid #17201d2d;font-size:.8rem}.bar .grow{flex:1}.bar button{border:1px solid #17201d44;background:#fffaf0;color:#17201d;padding:.42rem .65rem;cursor:pointer}.bar button:hover{background:#bedb39}.body{padding:clamp(1.4rem,4vw,3.6rem);max-width:1120px;width:100%;margin:auto}.meta{font:700 .76rem/1 monospace;letter-spacing:.13em;color:#b65322}.title{font-size:clamp(1.75rem,3.3vw,2.9rem);line-height:1.22;margin:.8rem 0 1.5rem}.summary{font-size:clamp(1.45rem,2.6vw,2.15rem);line-height:1.5;font-weight:850;color:#1f533f}.steps{padding-left:1.5em}.steps li{font-size:clamp(1.15rem,2vw,1.65rem);line-height:1.72;margin:1rem 0}.sources{margin-top:2rem;padding-top:1rem;border-top:1px solid #17201d33;font-size:.85rem;color:#687068;line-height:1.55}button:focus-visible{outline:3px solid #f47a31;outline-offset:2px}@media(max-width:680px){.bar{font-size:.72rem}.body{padding:1.3rem}}</style></head><body><div class="bar"><b id="count">-</b><span id="time">00:00</span><span id="slideTime">00:00</span><span class="grow"></span><button data-cmd="prev">이전</button><button data-cmd="next">다음</button><button id="timer" data-cmd="timer">시간 멈춤</button><button data-cmd="reset">시간 초기화</button><button id="full">대사 전체화면</button><button data-cmd="cycleNotes">닫기</button></div><main class="body" id="body"></main><script>let snap=null;const esc=v=>String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));const fmt=s=>{s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};const elapsed=()=>snap?snap.elapsed+(snap.running?(Date.now()-snap.capturedAt)/1000:0):0;function render(){if(!snap)return;const s=snap.slide;document.getElementById('count').textContent=(snap.index+1)+' / '+snap.count;document.getElementById('slideTime').textContent=fmt(s.duration);document.getElementById('timer').textContent=snap.running?'시간 멈춤':'시간 계속';document.getElementById('body').innerHTML='<div class="meta">'+esc(s.section)+' · '+String(snap.index+1).padStart(2,'0')+' / '+snap.count+'</div><h1 class="title">'+esc(s.title)+'</h1><p class="summary">'+esc(s.notes.summary)+'</p><ol class="steps">'+s.notes.steps.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>'+(s.sources?.length?'<div class="sources"><b>[Sources]</b><br>'+s.sources.map(esc).join('<br>')+'</div>':'');}window.addEventListener('message',e=>{if(e.data?.type==='state'){snap=e.data;render()}});setInterval(()=>{document.getElementById('time').textContent=fmt(elapsed())},250);const cmd=c=>window.opener?.postMessage({type:'command',command:c},'*');document.querySelectorAll('[data-cmd]').forEach(b=>b.onclick=()=>cmd(b.dataset.cmd));document.getElementById('full').onclick=async()=>{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()};document.addEventListener('fullscreenchange',()=>document.getElementById('full').textContent=document.fullscreenElement?'전체화면 해제':'대사 전체화면');addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;const k=e.key.toLowerCase();if(['arrowright','pagedown',' '].includes(k)){e.preventDefault();cmd('next')}else if(['arrowleft','pageup'].includes(k)){e.preventDefault();cmd('prev')}else if(k==='n'){e.preventDefault();cmd('cycleNotes')}else if(k==='t'){e.preventDefault();cmd('timer')}else if(k==='a'){e.preventDefault();cmd('auto')}else if(k==='f'){e.preventDefault();document.getElementById('full').click()}else if(k==='escape')cmd('cycleNotes')});addEventListener('beforeunload',()=>window.opener?.postMessage({type:'popupClosed'},'*'));<\\/script></body></html>\`}
    function toggleTimer(){if(state.running){state.accumulated=elapsedSeconds();state.running=false}else{state.startedAt=Date.now();state.running=true}state.capturedAt=Date.now();updatePresenter()}
    function resetTimer(){state.accumulated=0;state.startedAt=Date.now();state.running=true;state.capturedAt=Date.now();updatePresenter()}
    function toggleAuto(force){state.auto=typeof force==='boolean'?force:!state.auto;scheduleAuto();toast(state.auto?'자동 재생을 시작했습니다.':'자동 재생을 멈췄습니다.');sendPopup()}
    function toggleFullscreen(){if(!document.fullscreenElement)document.documentElement.requestFullscreen();else document.exitFullscreen()}
    function toast(message){els.toast.textContent=message;els.toast.classList.add('show');clearTimeout(toast.handle);toast.handle=setTimeout(()=>els.toast.classList.remove('show'),1800)}
    function execute(command){if(command==='next')go(state.index+1);else if(command==='prev')go(state.index-1);else if(command==='cycleNotes')cycleNotes();else if(command==='timer')toggleTimer();else if(command==='reset')resetTimer();else if(command==='auto')toggleAuto();else if(command==='fullscreen')toggleFullscreen()}
    addEventListener('message',event=>{if(event.data?.type==='command')execute(event.data.command);else if(event.data?.type==='popupClosed'){state.popup=null;state.notesMode='hidden'}});
    addEventListener('keydown',event=>{if(['INPUT','TEXTAREA'].includes(event.target.tagName))return;const key=event.key.toLowerCase();if(['arrowright','pagedown',' '].includes(key)){event.preventDefault();execute('next')}else if(['arrowleft','pageup'].includes(key)){event.preventDefault();execute('prev')}else if(key==='home')go(0);else if(key==='end')go(slides.length-1);else if(key==='n'){event.preventDefault();cycleNotes()}else if(key==='f'){event.preventDefault();toggleFullscreen()}else if(key==='t'){event.preventDefault();toggleTimer()}else if(key==='a'){event.preventDefault();toggleAuto()}else if(key==='?'){els.help.classList.toggle('open')}else if(key==='escape'){els.help.classList.remove('open');if(state.notesMode==='drawer')setNotesMode('hidden')}});
    document.getElementById('prev').onclick=()=>execute('prev');document.getElementById('next').onclick=()=>execute('next');document.getElementById('notes').onclick=cycleNotes;document.getElementById('full').onclick=toggleFullscreen;
    els.drawer.addEventListener('click',event=>{const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;if(action==='close')setNotesMode('hidden');else if(action==='popup')setNotesMode('popup');else execute(action)});
    document.querySelector('[data-close-help]').onclick=()=>els.help.classList.remove('open');
    document.querySelector('[data-copy-prompt]').addEventListener('click',async()=>{const text=document.querySelector('.starter').innerText;await navigator.clipboard.writeText(text);toast('시작 문장을 복사했습니다.')});
    setInterval(()=>{els.drawerTime.textContent=formatTime(elapsedSeconds());if(state.popup?.closed){state.popup=null;if(state.notesMode==='popup')state.notesMode='hidden'}},250);
    const hashIndex=slides.findIndex(s=>'#'+s.id===location.hash);go(hashIndex>=0?hashIndex:0);
  </script>
</body>
</html>`;

await mkdir(here, { recursive: true });
await writeFile(output, html, "utf8");
console.log(`Built ${output}`);
console.log(`Slides: ${slides.length}, planned duration: ${slides.reduce((sum, slide) => sum + slide.duration, 0)}s`);
