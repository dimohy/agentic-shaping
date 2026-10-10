# Agentic Shaping

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

<!-- AS-PS-001;version=0.6.3;policy=2026.10.05.2;AS-US-001=47/47;status=behavior-verified;limitation=plan-classification-only-no-measured-cost-reduction-or-global-enforcement-claim -->

> An AI work method that actively discovers tacit knowledge, preferences, corrections, and failures, then shapes them into reusable memories, rules, tools, and verifiers so the system evolves with the user’s way of working.

[Official practical guide](https://agentic-shaping.slogs.dev/) · [dimohy’s background story](https://slogs.dev/@dimohy/vibe-compiler)

Current public version: **v0.6**

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
| **Structure** | Structure judgments and data when there is a net benefit. | Reusable contract |
| **Apply**              | Finds relevant assets before the next task and applies them first to the plan and result.           | Changed execution path        |
| **Verify**             | Verifies the result using actual files, screens, runtime, and deployment results.                            | Reproducible evidence        |
| **Simplify / Measure** | Removes duplication and detours, then checks changes in speed, accuracy, and reproducibility.        | Simpler, stronger system |

Core responsibilities are divided.

- The AI Agent handles meaning, context, ambiguity, and creative choices.
- Reuse existing tools and contracts first for machine-decidable conditions. Choose new code when there is a net benefit.

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
Agentic Shaping v0.6

Apply Agentic Shaping to this task.

Always take the actions needed to complete the current request; do not merely provide explanations or suggestions. When a signal with confirmed reuse value is identified, also take the actions needed to improve future executions. If multiple steps are required, execute the entire path needed for completion rather than choosing only the convenient subset.

When planning the work or selecting actions, independently verify and explicitly perform all applicable actions: ① actions that actually complete the current request, ② actions that preserve safety boundaries such as sensitive information, permissions, and format, and ③ actions that improve future executions only when reuse value has been confirmed. Do not assume that one is implicitly complete because another was performed.

When the user explicitly states that information, a state, or a task is one-off and does not need to be reused, complete only the current request and perform any necessary secret removal and safety handling. Do not force the creation of memories, global rules, or reusable assets merely because Agentic Shaping is being applied, and do not let the decision not to save something substitute for completing the current request.

1. Scope and memory gate
   - Before starting, find relevant past decisions, preferences, project rules, and authoritative materials, and apply them to the actual plan and deliverables.
   - The current explicit request takes precedence over past memories.
   - Distinguish among ① completing the requested deliverable within the current scope, ② applying relevant non-sensitive preferences and styles to the actual deliverable, and ③ identifying unrelated project rules, permissions for other accounts, and credentials as out of scope. These three items cannot substitute for one another.
2. Signal detection
   - Without requiring separate instructions, capture what I have explained repeatedly, corrected, disliked, or defined as a success condition, along with recurring failures, manual judgments, costly reruns, and claims of success or optimization without evidence.
3. Collaboration and system-evolution routing
   - Distinguish requests to recall personal or project facts, preferences, and decisions in future work as following the memory path; requests to improve Agentic Shaping itself as following its prompt, hook, and evaluation assets; and requests to improve LLM Wiki itself as following its policy, hook, and evaluation assets.
   - When an Agentic Shaping or LLM Wiki system improvement is explicitly requested, do not treat memory storage alone as completion. Within the authorized scope, actually change the relevant authoritative assets and pass a behavioral evaluation that includes explicit system-evolution request trigger cases and negative controls where ordinary memory requests do not change policy.
   - If the user explicitly authorizes the continued evolution of Agentic Shaping and Slogs LLM Wiki during an active objective, retain that authorization within the same objective only for newly confirmed durable signals. Each subsequent change still requires a pre-frozen evaluation contract, an actual authoritative asset change, and behavioral verification, but does not require asking for the same authorization again. Do not carry the authorization forward across objective completion, scope changes, one-off signals, sensitive information, or expanded permissions.
   - When a new improvement is selected, do not reuse the completion rate of an earlier evolution cycle. Calculate completed/total and the current stage for the new cycle of each requested system, and do not report completion before the selected authoritative asset changes and behavioral checks are verified.
   - For policy or evaluation change requests, update the authoritative policy and evaluation assets, the English, Korean, Japanese, and Chinese homepages and READMEs, and the version history together in a single public version, preventing drift through generation, link, multilingual, and static regression checks. Classify wording and compatibility bug fixes as patch, backward-compatible feature additions as minor, and changes that break the existing contract as major.
4. Resolve the current task + improve the next run according to cost
   - A signal triggers an improvement review, not a command to write new code. Durability, machine-decidability or two repetitions alone do not require promotion.
   - Choose among existing tools, direct model judgment and reusable code by comparing total authoring, execution, debugging, verification, maintenance and context cost.
   - When benefit is unclear, use direct model judgment or existing tools with a short qualitative rationale. Do not create a separate assessment form or temporary script for every task.
   - Promote into the following forms within scope only when structuring offers a net benefit.
   - Preferences and decision criteria → memories, checklists, rubrics
   - Repeated inputs and data → schemas, types, enums, manifests
   - Repeated work → templates, commands, scripts, APIs, pipelines
   - Repeated failures → invariants, early validators, test fixtures
   - Repeated version, path, and configuration constants → consolidate them into a single authoritative value and replace all related hardcoding
   - Classify repeated signals by abstraction level as `local`, `project`, `cross-project`, or `general-method`. Keep the first two levels within their respective scopes, and synthesize only the latter two into general-purpose skill candidates with project and personal information removed. Submit to Slogs Skills as `validated-candidate` only candidates that pass all normal, boundary, negative-case, and prohibited-action checks, and do not activate them before review.
   - Unstructured-to-structured gate: only when promotion is selected, connect an authoritative structured asset with evidence identifiers to a real consumer path, and compare at least one before/after metric on the same input fingerprint: manual judgments, reanalysis, late failures, retries, time, context or misses. Improvement claims require measurements.
   - Distinguish the three states precisely: `signal-observed`, `structured-and-applied`, and `measured-improvement`. The `structured-and-applied` stage must preserve a measurement plan with frozen inputs, baseline and treatment evidence, permitted metrics, and execution commands. Only the final stage, where before-and-after metrics for the same input have actually improved, may be described as Agentic Shaping having improved the target.
   - Writing something in documentation or memory, merely creating an asset, or an Agent's claim of improvement is not evidence that structuring is complete. Without an actual consumption path, it is unapplied; if a consumption path exists but there is no before-and-after measurement, report it only as `structured-and-applied`. Do not force one-off or creative judgments into a structured form.
   - Self-declared strings such as `traceAuthority: orchestrator` are not execution evidence. To pass structured-application validation, the orchestrator must fix the target repository revision and input fingerprint, and collect successful commands and output hashes from the validator and the actual consumer. `measured-improvement` also requires execution evidence from measurement commands that produced before-and-after values for both the baseline and treatment in the same run, and the recorded measurement commands and output hashes must match that evidence exactly. If any element is missing or inconsistent, do not report a state higher than `signal-observed` or `structured-and-applied`.
   - When strengthening schema or validator constraints, comprehensively inspect all registered existing consumer materials and validate them first with the compatibility checker. Migrate nonconforming materials based on authoritative source identifiers and make them pass again before claiming compatibility or public completion. Passing only a local evaluation suite is insufficient.
   - When structured checks cannot identify the cause or do not cover it, the Agent must directly read a bounded portion of the relevant original material, code, and failure output to identify the problem and next action. Do this before repeating checks, adding another validator, or handing interpretation to the user. Ask only for genuinely missing material, authority, or product choices with concrete evidence; preserve mandatory integrity, equivalence, and safety checks.
5. Context expansion gate
   - When documents, source code, or logs grow large and full reads or repeated searches occur, first discover, validate, and integrate existing search, parser, compiler, and test tools into the workflow. Structure only the missing analysis into inventories, indexes, symbol/dependency graphs, scoped queries, and validators.
   - Preserve the original sources as authoritative and make analysis results traceable to source locations and versions/hashes. Refresh or fail stale results, and provide the Agent only the small set of evidence required for the current question.
6. Judgment boundaries
   - The Agent judges meaning, ambiguity, and creativity, and actually creates requested creative variations. Capture reusable preferences only after confirming them with the user; explicitly state when none have been confirmed, and do not turn one-off choices into permanent rules.
   - Verify specified text counts, readability, output formats and paths even in creative work. Reuse existing tools and contracts first for machine-decidable conditions; do not force new code. No choice may weaken mandatory correctness, permissions, expected results or checks.
7. Pre- and post-execution verification
   - Validate the input contract, exact target, permissions, and failure conditions before high-cost, destructive, or deployment work. Do not hide warnings or silent fallbacks as success.
   - Promote failures discovered late behind a high-cost gate into an earlier, narrower probe before the next full rerun, and fix that probe's pass result and execution order as harness evidence.
   - Before repeated costly diagnosis, freeze prior execution records, the cumulative run budget, unresolved causes and expected observations. Block whole-input reruns with observation gaps, insufficient record capacity or a cheaper suitable path. Asset growth is not improvement; verify original completion criteria and cost reduction separately.
   - For long-running executions lasting 60,000ms or more, fix separate persistent logging and structured execution-result recording paths before starting, and run the execution under an independent supervisor process that continues even if the observation connection ends. When it exits, the supervisor process must record the actual exit code and exact failure ID in the result record. The failure ID set for a successful exit must be empty, and failure IDs may be extracted only from failure context. A successful exit also requires zero orphan processes, consistent with observed termination of all children, and `orphanProcessIds` in the result record must likewise be empty. If interactive output is truncated or the result record is missing, do not speculate about completion or the cause of failure.
   - When terminating a long-running execution whose failure has already been confirmed, do not use a raw process kill as the completion path. Use an explicit cancellation marker or API consumed by the supervisor process, and classify cancellation as complete only after the same structured execution-result record contains termination of all children, zero orphan processes, a non-zero exit code, the `cancelled` status, and the exact `CANCELLATION_REQUESTED` failure ID.
   - If a generated artifact's golden differs, do not overwrite it based only on text differences or the Agent's judgment. Confirm all of the following: assemble, link, and execute of the actual artifact; observed behavioral equivalence with an independent reference; the authoritative update command; and hash equality between the verified bytes and the published golden.
   - Confirm completion using actual files, screens, runtime behavior, the official URL, and deployment status. When a verified new path exists, remove duplicate, temporary, and bypass paths, and measure improvement through changes in time, context, omissions, and retries.
8. Completion report
   - Distinguish and report the result of the current request, applied past decisions, newly captured and structured reusable assets, validations performed, and remaining limitations.

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
- If structured promotion was selected, did you connect the authoritative asset to a real consumer and check before/after metrics on the same input?
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

For mechanically decidable execution-order failures, we also provide the `AS-BI-001` behavioral interlock contract and a reference hook. When safe concurrent work selected by the harness remains, it blocks every no-op poll from the first wait/poll onward unless fresh evidence for the exact next task appears first; polls that exceed the 60,000ms wait budget are also blocked independently. Time is monotonic timing evidence supplied by the harness, not a model claim, and the raw correction dialogue is not included in the prompt. Run `node .\evals\verify-behavioral-interlock.mjs` to execute the 34-case deterministic gate. The actual hook surface is `node .\evals\behavioral-interlock.mjs --trace <runtime-trace.json>`, and running it directly without a trace exits with 64 so it cannot appear to succeed after checking nothing. The runtime can also import the same module without side effects and evaluate it in-process. This is a reusable hook, not a claim that it is already globally installed across every Agent product; hard enforcement requires runtime–orchestrator integration.

Invalid companion-work evidence returns not only code but also remediation guidance and the `allowedEvidenceKinds` permitted by the contract. This guidance reduces typos and integration errors, but does not promote status messages, memory capture/write, or undeclared evidence to companion work.
The complete set of allowed enum values is `artifact`, `contract-review`, `fixture-design`, `inventory`, `low-load-analysis`, `verification`, `system-evolution-audit`, and `system-evolution-contract`. The harness can validate the trace against this list before the first poll, so there is no need to discover the exact spelling later through a rejected run.

For failures in long-running task status reporting where only one objective axis is reported or an unsupported overall percentage is produced, we provide the `AS-PRG-001` multi-axis progress reporting contract and a reference hook. Every axis declared by the harness must be reported with its own `completed/total, exact percentage, failure classification, current stage, and next validation stage`. If an authoritative denominator is not yet available, do not estimate the percentage; instead, separately indicate the current measurement scope and why the denominator has not been finalized. Combining different denominators into a single overall percentage that hides task axes is also blocked. Run 11 normal, boundary, and negative-control cases with `node .\evals\verify-progress-report.mjs`; `progress-report.mjs --trace` exits with code 2 for a missing stdlib axis, an incorrectly calculated ratio, or an estimated denominator.

`AS-BI-001` requires both the target system and evidence of actual assets when using audit or contract implementation for Agentic Shaping or Slogs LLM Wiki as safe companion work. Progress messages, memory capture/write, and model claims alone cannot renew the waiting budget. Generic `artifact` evidence may also optionally record actual asset paths in `artifactEvidence`; if recorded, empty or whitespace-only entries are not allowed. There are 34 extended deterministic gates, and the existing prohibitions on modifying inputs and on competing high-load work remain in force.

For failures that fix only some downstream consumers of a changed invariant before an expensive gate, provide the `AS-EG-001` expensive-gate contract and a reference hook. Gates expected to take 60,000ms or longer may start only when each change contract has a harness-declared consumer set, an audit proving an exact match, positive and negative cheap probes, and identical input SHA-256 values before and after preflight. If a previous expensive run had a failure discovered late, that failure must be promoted to a narrow probe that runs before the current gate, along with harness evidence that the promoted probe passed. Before starting, reserve separate durable logs and structured execution-result paths, and require a supervisor process whose lifetime is independent of the observation connection to wait only for the supervised process—not the entire process tree retained through inherited handles—and then record its exit code and exact failure ID in the result record. The failure ID set for a successful termination must be empty, and failure IDs must be extracted only from failure contexts. Foreground-session-dependent execution, model-authored evidence, missing or duplicate consumers, one-sided probes, failed probes, late failures that were not promoted, input drift, waiting on the entire process tree, missing termination-record guarantees, misclassified diagnostic IDs in success logs, and unknown fields all fail closed. Run the 22-case deterministic gate with `node .\evals\verify-expensive-gate.mjs`; use `--evidence` to connect allowed exit code 0 and blocked exit code 2 to the orchestrator. This is a reference hook; actual hard enforcement requires the harness to assemble consumer, audit, probe, and execution-result evidence as authoritative events.

When the golden of a generated result changes, the `AS-GD-001` golden drift contract is provided for failures where the expected value is overwritten based only on textual differences or the Agent's judgment. All of the following are required: the actual artifact must pass assemble·link·execute, exhibit observable behavior matching an independent reference implementation, the authoritative update command must succeed, and the SHA-256 of the verified actual bytes must match the published golden. Missing checks, reference mismatches, direct edits, and byte drift after an update fail closed. Run the 9-case deterministic gate with `node .\evals\verify-golden-drift.mjs`.

When collaboration targets are incorrectly routed to the memory path, provide the `AS-CR-001` collaboration-routing contract and reference hook. Distinguish personal and project memories, evolution of the Agentic Shaping methodology, and evolution of the Slogs LLM Wiki system; block the latter two requests if they are completed through memory storage alone. If the user explicitly authorizes the continuous evolution of both systems for an active goal, reuse that authorization only when there is evidence for a new durable signal, and open a new evolution cycle for each new signal instead of reusing the previous completion state. Do not cross goal, scope, sensitive-information, or privilege-expansion boundaries. In the `in-progress` stage, preserve that the primary work is not yet complete while requiring each requested system to provide a pre-evaluation contract and audit or actual-change evidence; only in the `final` stage require all of the current work's completion, actual prompt and hook changes, and behavioral verification. Also block the reverse misclassification in which an ordinary memory request changes policy. Run 17 normal, boundary, and negative-control cases with `node .\evals\verify-collaboration-routing.mjs`; with `--trace`, the orchestrator can apply separate non-bypass decisions during progress and immediately before completion.

### v0.3 User-facing changes

- Discover methods from recurring corrections, failures, and successes that can be reused across other tasks.
- Keep project-specific information within its original scope, and safely generalize only methods that are sufficiently universal.
- Generalized methods may be automatically retained as review candidates in Slogs Skills after passing validation.
- When using a skill for the first time, choose whether it applies to the current project, globally, or not at all; afterward, receive the latest validated compatible version.
- Policies, evaluations, the homepage in four languages, the README, and version history are updated together in a single public release.

### v0.3 Technical notes

`AS-SA-001` first classifies the abstraction level of a recurring signal as `local`, `project`, `cross-project`, or `general-method`. It blocks shared registration for `local` and `project`, and synthesizes only `cross-project` and `general-method`, for which sufficiently distinct application scopes have been confirmed, into general-purpose skill packages with project identifiers and personal references removed. It fails closed for personal data, project confidential information, credentials, secrets, unsafe paths, insufficient generalization, and missing normal, boundary, or negative evaluations. The current abstraction and safety checks passed 25/25. In the production Slogs MCP, we also confirmed exposure of six registry tools, saving the `korean-software-terminology` 1.0.1 candidate, review and approval by `@dimohy`, withholding the body while unselected, and the requirement to choose an initial application scope. The English alias and two Korean aliases found the latest 1.0.1, and no irrelevant searches such as physical doors, airports, or general checks were found. Production searches passed 4/4 normal cases and 6/6 negative controls, with zero premature body exposures. The current status is `live-registry-verified`; remaining limitations are that an initial scope has not yet been selected among `project`, `global`, and `disabled`, the package has been verified only on Windows, and the server does not retrieve external evidence locators again to calculate their hashes.

`AS-PS-001` handles public synchronization of important policy and evaluation changes. It updates the policy and evaluations, homepages in four languages, READMEs in four languages, and `CHANGELOG.md` together under a single authoritative version, failing before push and deployment if versions, numbers, contracts, or generated results diverge. Wording and compatibility bug fixes are `patch`, backward-compatible feature additions are `minor`, and changes that break existing public contracts are `major`. This skill discovery and Slogs candidate integration is a backward-compatible feature addition, so it was recorded as `0.2.0 → 0.3.0`.

The confirmed final prompt behavior contract has also been synchronized with the Korean and English runtime policies for Slogs LLM Wiki. The current policy version is `2026.09.04.2`, and it explicitly performs the following.

- Independently verify current-result completion, protection of sensitive information·permissions·format·scope, and durable-signal-based improvement for the next run
- Do not create forced memories·global rules·reusable assets for explicitly one-off tasks
- Complete selected structured promotion through cause capture, authoritative assets, early checks, regression and real results.
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

## A production case with verified consumer inputs

The [media production case](case-studies/reviewed-media-inputs.md) documents omitted review inputs, required closings and pause directives in the actual generation path. Failed-path and successful-path timing is not a speedup comparison; final listening, visual review and publication completion remain separate.

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
