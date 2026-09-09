# Changelog

Agentic Shaping uses Semantic Versioning. Compatible wording and bug corrections increment `patch`, backward-compatible capabilities increment `minor`, and incompatible public-contract changes increment `major`.

## [0.5.7] - 2026-09-09

### What changed for users

- Successful long-running termination now requires both observed zero orphans and an empty `orphanProcessIds` field in the structured result.
- A result that claims success while recording an orphan PID fails closed even when a separate observation counter says zero.
- Natural success and supported cancellation now use the same exact process-tree closure evidence instead of two weaker completion rules.
- Invalid terminal records fail before a release can publish their result as successful or cancelled.

### Technical notes

- Compatibility: Valid natural-success and cancellation records with an empty `orphanProcessIds` array retain their existing behavior.
- Contracts: `AS-CT-001` version 2 requires observed zero orphans and a matching empty structured-result array.
- Verification: `AS-CT-001` passes 7/7 deterministic cases, including the mismatched-success negative control.
- Known limitation: A runtime must still integrate a supported cancellation marker or API and record the complete supervised process tree.

## [0.5.6] - 2026-09-09

### What changed for users

- Long-running work now distinguishes supported cancellation from raw process termination.
- A cancellation is complete only after the process tree is closed with zero orphans and a structured terminal result records a nonzero exit, `cancelled` status, and `CANCELLATION_REQUESTED`.
- Raw kill, missing terminal result, and surviving-child negative controls fail closed.

### Verification

- `AS-CT-001` passes 6/6 deterministic cases, including natural-exit compatibility.

## [0.5.5] - 2026-09-09

### What changed for users

- Tightened schemas and validators now require a compatibility scan across registered downstream trace corpora before publication.
- Descriptive revision labels that violate the authoritative revision contract fail before an expensive consumer runs.
- Invalid historical traces must be migrated from authoritative source identities and revalidated.
- New empty-corpus and malformed-trace negative controls prevent false compatibility claims.

### Technical notes

- Compatibility: this patch preserves the strict revision hash contract and adds downstream migration enforcement.
- Contracts: `AS-US-COMPAT-001` inventories explicit trace roots and fails closed on missing, empty, malformed, or incompatible corpora.
- Verification: the compatibility suite passes 5/5 and is consumed by the full evaluation-report check.
- Known limitation: repositories must explicitly register each downstream trace root with the compatibility verifier.

## [0.5.4] - 2026-09-09

### What changed for users

- Detached supervisors must wait for the exact supervised process, not an inherited-handle process tree that can remain alive after the target exits.
- A new negative control blocks long gates whose supervisor can hang after successful target termination.
- The expanded `AS-EG-001` suite covers 22 deterministic cases.
- Existing observer-disconnect, exit-code, and failure-context guarantees remain mandatory.

### Technical notes

- Compatibility: this patch tightens the existing detached-supervisor lifecycle contract.
- Contracts: `outcomeObservability` adds `waitsOnSupervisedProcessOnly`.
- Verification: the high-cost gate suite passes 22/22 before publication synchronization.
- Known limitation: target runtimes still own the platform-specific exact-process wait implementation.

## [0.5.3] - 2026-09-09

### What changed for users

- Successful long-running commands must publish an empty failure-identifier set.
- Failed commands derive identifiers only from lines that contain failure context.
- Passing negative diagnostics can no longer be misclassified as command failures.
- The expanded `AS-EG-001` suite covers 21 deterministic cases.

### Technical notes

- Compatibility: this patch tightens the existing structured outcome semantics.
- Contracts: `outcomeObservability` adds success-empty and failure-context invariants.
- Verification: the high-cost gate suite passes 21/21 before publication synchronization.
- Known limitation: each target harness still owns its failure-context vocabulary.

## [0.5.2] - 2026-09-09

### What changed for users

- Long-running gates must use a detached supervisor whose lifetime does not depend on the observing session.
- The supervisor must continue after observer disconnect and write a structured completion record when it terminates.
- Foreground-session execution, observer-dependent lifetime, and missing termination-record guarantees now fail closed.
- The expanded `AS-EG-001` suite covers 19 deterministic normal, boundary, and negative-control cases.

### Technical notes

- Compatibility: this is a backward-compatible `patch` release extending the existing outcome-observability contract.
- Contracts: `outcomeObservability` now requires `executionMode`, `survivesObserverDisconnect`, and `writesCompletionRecordOnTermination`.
- Verification: the expanded high-cost gate suite passes 19/19 before publication synchronization.
- Known limitation: the target runtime must still launch and monitor the detached supervisor from authoritative process events.

## [0.5.1] - 2026-09-09

### What changed for users

- A long-running expensive gate must reserve a durable log and a separate structured completion record before launch.
- The completion-record contract must preserve the process exit code and exact failure identifiers, so truncated interactive output cannot erase the result.
- Missing exit-code capture, missing failure identifiers, and aliased log/record paths fail closed.
- Schema fields now use `completionRecordPath` and `recordSchemaVersion` consistently across documentation, fixtures, and runtime validation.

### Technical notes

- Compatibility: this is a backward-compatible `patch` release extending `AS-EG-001` preflight evidence.
- Contracts: the expensive-gate schema is version 3 and adds `outcomeObservability`.
- Verification: expensive-gate normal, boundary, late-failure, and outcome-observability controls pass 16/16.
- Known limitation: hard enforcement still depends on the runtime or orchestrator creating the declared log and completion record from authoritative process events.

## [0.5.0] - 2026-09-09

### What changed for users

- A changed golden is no longer accepted from a text diff or Agent judgment alone.
- The actual artifact must assemble, link, and execute, and its observable behavior must match an independent reference.
- The authoritative update command must publish the exact bytes that passed those checks.
- Missing checks, reference mismatch, direct edits, and post-validation byte drift fail closed.

### Technical notes

- Compatibility: this is a backward-compatible `minor` release adding the independent `AS-GD-001` golden-drift contract.
- Contracts: the new schema separates artifact validity, reference behavior, update authority, and published-byte identity.
- Verification: golden-drift positive and negative controls pass 9/9.
- Known limitation: the harness must supply trustworthy artifact and reference evidence; the evaluator does not execute compilers itself.

## [0.4.2] - 2026-09-08

### What changed for users

- A failure discovered late in an expensive gate must be promoted to an earlier narrow probe before the expensive gate is rerun.
- Harness evidence now records where the failure was discovered, where its probe was promoted, and which passing probe closes it.
- An unpromoted late failure blocks the expensive rerun instead of permitting another costly late discovery.
- The lifecycle remains fail-closed and does not treat an Agent-authored claim as execution evidence.

### Technical notes

- Compatibility: this is a backward-compatible `patch` release extending expensive-gate preflight evidence.
- Contracts: `AS-EG-001` schema v2 adds ordered `priorLateFailures` and requires each one to reference a passing earlier probe.
- Verification: expensive-gate normal, boundary, and late-failure promotion controls pass 13/13.
- Known limitation: hard enforcement still depends on the runtime or orchestrator supplying authoritative gate ordinals and probe evidence.

## [0.4.1] - 2026-09-08

### What changed for users

- A newly confirmed durable signal now reopens separate Agentic Shaping and Slogs LLM Wiki evolution cycles instead of reusing a previously completed percentage.
- Completion remains blocked until each reopened cycle has a material authoritative-asset change and behavioral verification.
- Progress reports recompute completed/total steps and the current stage independently for both systems.
- The same lifecycle contract is synchronized across all four localized homepages and READMEs.

### Technical notes

- Compatibility: this is a backward-compatible `patch` release refining the v0.4 standing-authorization lifecycle.
- Contracts: `AS-CR-001` schema v4 requires `evolutionCycle.reopenedAfterDurableSignal` for standing-authorization traces.
- Verification: collaboration-routing normal, boundary, and stale-cycle negative controls pass 17/17.
- Known limitation: hard enforcement still depends on the runtime or orchestrator supplying authoritative active-goal, durable-signal, and cycle evidence.

## [0.4.0] - 2026-09-08

### What changed for users

- Explicit authorization to keep evolving Agentic Shaping and Slogs LLM Wiki now remains active for durable signals within the same active goal, without repeatedly asking for the same authority.
- That authorization expires at goal completion or scope change and never extends to one-off signals, sensitive data, or broader authority.
- Each evolution still requires a pre-frozen evaluation contract, a material authoritative-asset change, and behavioral verification.
- The same contract and pass count are synchronized across the four localized homepages and READMEs.

### Technical notes

- Compatibility: this is a backward-compatible `minor` release; existing explicit-request traces remain valid after declaring their trigger kind.
- Contracts: `AS-CR-001` now distinguishes `explicit-request` from `standing-authorization-durable-signal` and requires active-goal authorization evidence plus durable-signal evidence.
- Verification: collaboration-routing cases pass 16/16; adjacent production-routing, behavioral-interlock, and progress-report deterministic regressions pass 68/68.
- Known limitation: hard enforcement still requires the runtime or orchestrator to supply authoritative active-goal and durable-signal evidence.

## [0.3.1] - 2026-09-04

### What changed for users

- The public evaluation commands documented in v0.3 are now included in the GitHub package and can be run from a clean checkout.
- Korean and English searches now find the validated `korean-software-terminology` 1.0.1 skill before its first-use scope is chosen.
- Release checks now stop publication when a documented capability is missing from the tracked package.
- Published pass counts are checked against the verifier that actually runs.

### Technical notes

- Compatibility: this patch does not change the v0.3 policy or public behavior contracts.
- Contracts: the release manifest now closes each public rule over its contract, schema, runtime, verifier, suite, fixtures, and adapter files.
- Verification: every declared verifier must run from the staged Git snapshot and report its manifest-declared pass count; live skill search passed 4/4 positive and 6/6 negative queries with no body disclosure.
- Known limitation: the Codex hook injects the contract only when a command starts; existing-session poll interception still depends on the runtime or orchestrator.

## [0.3.0] - 2026-09-04

### What changed for users

- Reusable working methods can now be discovered from repeated corrections, failures, and successful patterns.
- Project-specific details stay local, while broadly useful methods can be generalized safely across projects.
- A generalized method can be stored automatically in Slogs Skills as a review candidate after passing validation.
- Each skill asks once whether to apply to the current project, all projects, or remain disabled; accepted skills can follow the latest compatible validated version.
- Policy, evaluation, four localized homepages and READMEs, GitHub history, and release version now advance together from one release manifest.

### Technical notes

- Compatibility: this is a backward-compatible `minor` release from `0.2.0`; existing v0.2 workflows require no migration.
- Contracts: abstraction, privacy-safe package synthesis, candidate review state, first-use scope, version resolution, and multilingual publication synchronization now fail closed.
- Verification: Agentic Shaping abstraction and safety checks passed 25/25, lifecycle checks passed 17/17, and Slogs registry integration checks passed 36/36 with PostgreSQL integration 1/1; the full Slogs suite passed 251 tests with 22 skipped and no failures. Natural-language skill discovery was verified with all-token, order-independent matching and broad-query controls.
- Live integration: the operational Slogs MCP exposed all six registry methods, stored and validated `korean-software-terminology` 1.0.0, and withheld its content until the first-use scope is chosen.
- Known limitation: first-use scope (`project`, `global`, or `disabled`) is still undecided; this package is verified on Windows only, and external evidence locators are hash-bound but not fetched and rehashed by the registry.
- Detailed evidence: see [`evals/skill-abstraction-contract.json`](evals/skill-abstraction-contract.json), [`evals/skill-abstraction-traces.json`](evals/skill-abstraction-traces.json), and [`evals/skill-lifecycle-contract.json`](evals/skill-lifecycle-contract.json).
