# Agentic Shaping

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

> An AI work method that actively discovers tacit knowledge, preferences, corrections, and failures, then shapes them into reusable memories, rules, tools, and verifiers so the system evolves with the user’s way of working.

[Official practical guide](https://agentic-shaping.slogs.dev/) · [dimohy’s background story](https://slogs.dev/@dimohy/vibe-compiler)

Current public version: **v0.2**

## Language

`README.md` and the root homepage use English by default. Korean, Japanese, and Chinese documents are available through the language links near the top of this document, and the homepage provides [English](https://agentic-shaping.slogs.dev/) · [한국어](https://agentic-shaping.slogs.dev/ko/) · [日本語](https://agentic-shaping.slogs.dev/ja/) · [简体中文](https://agentic-shaping.slogs.dev/zh/) paths.

When you first visit the root homepage, it detects your browser language and selects one of English, Korean, Japanese, or Chinese. When you use the language selector, that choice is saved as the default for subsequent visits. If you open a specific language URL directly, that language is respected.

![An Agentic Shaping scene where an Agent organizes traces of human work into reusable rules and assets](assets/agentic-shaping-hero.jpg)

## Why is it needed?

When working with AI, the first result comes quickly. But if you have to explain the same writing style again in the next task, fix a result you previously said you disliked, and belatedly rediscover a failure you have already encountered, the speed does not compound.

Agentic Shaping does not stop at one good result. With every task, it **gradually improves the Agent and execution system that produce the next result**.

- A correction like “I don’t like sentences like this” becomes the style standard for the next document.
- Repeated input formats become schemas and types.
- Checks that are often missed become early validators and regression tests.
- Sequences previously performed by hand become commands, templates, and pipelines.
- Once a verified new path exists, temporary scripts and duplicate paths are cleaned up.

## How does it work?

Agentic Shaping repeats the following cycle.

| Stage                   | What the Agent does                                                          | Result that should remain        |
| ---------------------- | ------------------------------------------------------------------------ | ----------------------- |
| **Detect**             | Detects repeated explanations, user corrections, disliked results, late failures, and manual judgments. | Improvement candidate               |
| **Capture**            | Captures what went wrong, why it happened, the desired direction, and the scope of application.              | Evidence-based decision criterion   |
| **Structure**          | Formalizes judgments and data as memories, rubrics, schemas, types, and fixtures.          | Reusable contract      |
| **Apply**              | Finds relevant assets before the next task and applies them first to the plan and result.           | Changed execution path        |
| **Verify**             | Verifies the result using actual files, screens, runtime, and deployment results.                            | Reproducible evidence        |
| **Simplify / Measure** | Removes duplication and detours, then checks changes in speed, accuracy, and reproducibility.        | Simpler, stronger system |

Core responsibilities are divided.

- The AI Agent handles meaning, context, ambiguity, and creative choices.
- Code and contracts handle things that can be judged mechanically, such as repeated formats, invariants, failure conditions, and execution order.

This is not about making the Agent remember everything. The key is to **discover recurring unstructured judgments and promote only what is worth reusing into structured assets**.

## As documents and source code grow, the analysis approach evolves too

The more Agentic Shaping works, the more documents, vibe-coding source code, configurations, logs, and tests
accumulate. If the Agent rereads the entire source every time, exploration becomes slow because of service response and context
limits, and relevant information can get buried in long inputs, making analysis less accurate.
This is also repetitive work that should be formalized.

- Treat repeated full scans, long tool outputs, and repeated searches for the same symbols and dependency relationships as shaping signals.
- Reuse existing search tools, parsers, compilers, and tests first when they can answer the question.
- Promote only the gaps into inventories, document/symbol indexes, call/dependency/impact graphs, scoped queries,
  and consistency validators.
- The original source remains the authoritative source of truth. Preserve source locations and version/hashes in analysis results,
  update them when changes occur, and do not silently use stale results.
- Provide the Agent with a small evidence bundle needed for the current task, rather than the entire repository,
  and let the Agent judge meaning, context, and ambiguity.

The goal is not to keep piling up summary documents, but to create an **analysis surface that is traceable to and regenerable from the
original source**. Measure whether the total reanalysis volume, context usage, exploration
time, omissions, and retries actually decrease in the next execution.

## What changes?

| Task        | At first                            | After Agentic Shaping has accumulated                           |
| ----------- | ----------------------------------- | ------------------------------------------------------- |
| Coding        | Fix the symptom and stop.             | Reflect the cause in types, invariants, and tests to prevent recurrence.     |
| Documentation        | Explain the style and structure again each time. | Apply approved style, structure, and prohibited expressions first.           |
| Analysis        | Criteria remain only in the conversation.        | Preserve them as input schemas, decision criteria, and reproducible analysis procedures. |
| Images · video | Feedback disappears into the next production. | Carry it forward as style rules, scene plans, and review criteria.         |
| Deployment        | Mark it complete based only on a success message.      | Add gates that verify the actual URL, certificate, screen, and status. |

As a result, users repeat the same explanations and revisions less often, and the Agent can reach the user’s completion criteria faster with each task.

## Get started in 5 minutes

1. Add the prompt below to the persistent instructions of the Agent you use.
   - Codex: global or project `AGENTS.md`
   - Claude Code: `CLAUDE.md`
   - GitHub Copilot: repository instructions
   - Other Agents: project instructions or system prompt
2. Request real work as usual.
3. If you do not like the result, naturally correct it by explaining why and what direction you want.
4. Check that the Agent promoted the correction into an asset for use in the next execution, rather than applying it only to the current result.
5. In the completion report, check the actual verification results and the newly created reusable assets.

You do not need to build a massive automation system from the start. Begin by moving one recurring judgment into a checklist or validator.

## Application prompt

You can copy and use the content below as-is.

```text
Agentic Shaping v0.2

Apply Agentic Shaping to this task.

Do not merely explain or make suggestions. Always perform the actions that actually complete the current request, and when you identify a signal with reuse value, also take the actions that improve the next execution. If multiple steps are required, execute the entire path needed for completion instead of choosing only the convenient parts.

When planning the task or choosing actions, independently verify ① the actions that actually complete the current request, ② the actions that maintain safety boundaries such as sensitive information, permissions, and format, and ③ the actions that improve the next execution only when reuse value has been confirmed. Explicitly perform every applicable action. Do not assume that completing one means another is implicitly complete.

When the user explicitly says that information, state, or work is one-off and does not need to be reused, complete only the current request and perform any necessary secret removal and safety handling. Do not force memory, global rules, or reusable assets into existence merely because Agentic Shaping is being applied, and do not let the decision not to save anything substitute for completing the current request.

1. Scope and memory gate
   - Before starting, find relevant past decisions, preferences, project rules, and authoritative sources, and reflect them in the actual plan and deliverables.
   - The current explicit request takes precedence over past memories.
   - Distinguish ① completing the requested deliverable within the current scope, ② applying relevant non-sensitive preferences and style to the actual deliverable, and ③ treating unrelated project rules, permissions for other accounts, and credentials that were excluded as out of scope. None of these three can substitute for another.
2. Signal detection
   - Without requiring separate instructions, capture what I have explained repeatedly, corrected, disliked, or defined as a success condition, along with recurring failures, manual judgments, expensive reruns, and unsupported claims of success or optimization.
3. Current solution + next-execution structure
   - When there is a signal, do not stop after fixing only the current result. Execute the entire path required: complete the current task → capture the causes and decision criteria → update the authoritative assets → add early validation and regression checks → confirm the actual result.
   - Promote signals into the following forms according to their scope of application.
   - Preferences and decision criteria → memories, checklists, rubrics
   - Repeated inputs and data → schemas, types, enum, manifests
   - Repeated tasks → templates, commands, scripts, APIs, pipelines
   - Recurring failures → invariants, early validators, test fixtures
   - Repeated version, path, and configuration constants → consolidate them into single authoritative values and replace all related hardcoding
4. Context expansion gate
   - When documents, source code, or logs grow large enough that full reads and repeated exploration become a bottleneck, first discover, verify, and integrate existing search tools, parsers, compilers, and tests into the workflow. Structure only the missing analysis into inventories, indexes, symbol/dependency graphs, scoped queries, and validators.
   - Preserve the original sources as authoritative and make analysis results traceable to source locations and versions/hashes. Refresh stale results or fail, and provide the Agent only with the small evidence bundle needed for the current question.
5. Judgment boundaries
   - The Agent judges meaning, ambiguity, and creativity, and actually creates requested creative variations. Capture reusable preferences only after they have been confirmed by the user, explicitly state when nothing has been confirmed, and do not turn one-off choices into permanent rules.
   - Even in creative work, separately verify the specified text count, readability, output format, and path. Validate other machine-checkable properties, such as invariants and failure conditions, through code and contracts.
6. Pre- and post-execution verification
   - For high-cost, destructive, or deployment operations, verify the input contract, exact target, permissions, and failure conditions first. Do not hide warnings or silent fallback as success.
   - Confirm completion using actual files, screens, runtime behavior, official URLs, and deployment status. When a verified new path exists, remove duplicate, temporary, and workaround paths, and measure improvement through changes in time, context usage, omissions, and retries.
7. Completion report
   - Distinguish and report the result of the current request, past decisions applied, newly captured and structured reusable assets, verification performed, and remaining limitations.

Do not expand the current request or permissions, and do not save sensitive information, one-off state, or unverified speculation.
```

## Try asking this

### When starting a task

```text
Implement this feature. Before starting, first find and apply my relevant decisions and project rules,
and if recurring judgments or failure conditions become apparent, promote them into types, validators, and tests that can be reused in future work.
```

### When the same problem recurs

```text
Do not just fix the symptom; find out why it was not detected earlier.
From now on, make types, schemas, invariants, and early validators detect issues before the Agent's manual judgment.
```

### When finishing a task

```text
Reflect on the work just completed from an Agentic Shaping perspective.
Distinguish the decision criteria I discovered this time, the manual work I repeated, the failures detected late, and the reusable assets I newly created,
and organize what to apply first in the next run.
```

## How to tell whether the result is good

Agentic Shaping is not working merely because the prompt contains plausible-sounding sentences. You must be able to answer the following questions with actual evidence.

- Did the Agent discover the user’s correction or repeated failure on its own?
- Did it create memories, rules, schemas, tests, or tools that can be reused in the next task?
- When the deliverable grows in size, has a structured analysis surface emerged that lets you find the evidence you need without rereading everything?
- Can the analysis results be traced to source locations and version/hashes, and are they updated when changes occur?
- Did you find that asset before the next run and apply it to the actual plan and results?
- Did you verify it against the actual files, screens, runtime, and deployment state?
- After establishing a validated new path, did you clean up duplicate, temporary, and workaround paths?
- Have re-explanation, manual judgment, retries, or late failures decreased compared with before?

This repository's `evals/` gives the same tasks to a baseline group that does not apply the public prompt and to an applied group, comparing them separately on general task quality and Agentic Shaping-specific activation.

- Agentic Shaping differential evaluation: 26 paired scenarios, 52 runs with GPT-5.6 Luna Max
- Complete pass on distinctive behavior: baseline group 16/26(61.5%), applied group 25/26(96.2%)
- Distinctive behavior detailed criteria: baseline group 82/105(78.1%), applied group 104/105(99.0%)
- First-seen final holdout: baseline group 3/5(60%), applied group 5/5(100%)
- Current-task completion: 27/27 for both groups; prohibited behavior: 0 instances for both groups
- General quality and safety regression: baseline group 94/98(95.9%), applied group 96/98(98.0%), 0 prohibited behaviors
- Actual-file execution evaluation: 6/6 for both groups (confirms only that one task had no regression and does not establish prompt superiority)

The evaluation itself is also subject to Agentic Shaping. In this validation, small sample sizes, baseline-group instruction contamination, ambiguous cases, repeated failures, the cost of full reruns, and timeouts were captured as signals and promoted into the following assets.

- Separate general quality regressions from Agentic Shaping differential scores
- Distinguish the development set, the holdout after reviewing the results, and the first-seen final holdout
- Replay filtered failure cases first, then run the full regression suite
- Preserve repeated failure results as iteration JSON and observation documents instead of discarding them
- Allow checkpoint/resume only when the suite·prompt·model·case-list hashes match
- Separate timeouts from prompt failures and retry only once
- Preserve and correct grader defects that missed passing tests under `tests/` through recursive discovery

The confirmed final prompt behavior contract has also been synchronized to the Korean and English runtime policies of Slogs LLM Wiki. The final policy version is `2026.08.25.3` and explicitly executes the following:

- Independently verify current-result completion, protection of sensitive information·permissions·format·scope, and durable-signal-based improvement for the next run
- Do not create forced memories·global rules·reusable assets for explicitly one-off tasks
- Follow durable signals through capturing causes·criteria, authoritative assets, early validation·regression, and verification of actual results
- Consolidate repeated versions·paths·configurations into a single authority and replace all related hardcoding

You can check the synchronization status at [Slogs LLM Wiki final Korean policy](https://slogs.dev/prompts/slogs-mcp.ko.md) and the [version endpoint](https://slogs.dev/prompts/slogs-mcp.version).

Without merely checking for phrase inclusion, we directly injected the live policy URL into Luna Max and conducted 5 paired regressions·10 Agent runs. Distinctive behavior improved from 18/20(90%) in the baseline group to 20/20(100%) in the applied group, with 0 prohibited behaviors in both groups. This case is already a public regression set and should not be interpreted as a new undisclosed holdout. The original is preserved in `evals/slogs-policy-smoke-luna-max.json`.

These results are technical statistics from a single run on a fixed GPT-5.6 Luna Max set, not a population estimate or a guarantee across all model·tool environments. The applied group also missed one behavior under version drift. When the prompt changes, rerun the same evaluation and actual-execution gates.

```powershell
node .\scripts\check-readme-prompt.mjs
node .\scripts\check-eval-report.mjs
node .\scripts\check-slogs-policy-sync.mjs
node .\scripts\check-localization.mjs
node .\scripts\build-localized-content.mjs --check
node .\evals\run-evals.mjs
node .\evals\run-execution-eval.mjs
```

## Using It with LLM Wiki

Agentic Shaping can start with only the current conversation and project instructions. However, when the conversation ends, the context discovered along the way may disappear.

- **It works better with LLM Wiki.** Corrections·preferences·decision criteria can be retained over time and retrieved before the next task.
- **It works even better with Slogs LLM Wiki.** You can combine proactive recall before work, capture of intent-correction signals, separation of global principles from project memories, and an evidence-preserving update flow.

The important thing is not to save a lot. What matters is the cycle of finding relevant memories before work, actually applying them to the plan and results, verifying them, and updating them again.

## Safety Boundaries

Agentic Shaping is not a method for expanding an Agent's permissions.

- It does not exceed the scope and permissions requested by the current user.
- It does not retain sensitive information, tokens, passwords, or one-off logs as memories.
- When the current request conflicts with past memories, the current request takes precedence.
- It does not mix general principles with project-specific syntax·contracts·validation criteria.
- It does not reduce creative judgment to mechanical rules merely because it can be automated.

## Repository Structure

| Path                                    | Contents                              |
| --------------------------------------- | ------------------------------------- |
| `index.html`, `ko/`, `ja/`, `zh/`       | English-default homepage and localized homepages  |
| `site/`, `styles.css`, `script.js`       | Multilingual source files, translation catalog, and shared assets    |
| `assets/`                               | Generated images used on the page     |
| `evals/`                                | Behavioral and execution comparison evaluations for the baseline and applied groups |
| `scripts/`                              | Regression validator for wording and structure |

The official page is built and deployed on GitHub Pages and is available at [agentic-shaping.slogs.dev](https://agentic-shaping.slogs.dev/).

---

**Agentic Shaping continues to be applied.** We do not stop at achieving a good result once; we also improve the way the next result is produced.
