# Behavioral eval observations

## Evaluation expansion

On 2026-08-25, the behavioral suite expanded from 6 to 25 distinct paired
scenarios: 5 normal cases, 9 edge cases, and 11 negative controls across 9
categories. Each full comparison runs 50 independent GPT-5.6 Luna agents at
max reasoning effort. Percentages are descriptive scores for the fixed suite,
not population estimates.

The shared baseline instruction originally repeated two target behaviors:
staying within scope and requiring actual completion evidence. Those cues were
removed before the Luna Max optimization runs so the baseline did not receive
part of the shaping treatment.

## Pre-optimization run

The original v0.2 prompt produced 20/25 complete baseline scenarios and 23/25
complete shaped scenarios. Expected-action selection was 92/98 versus 95/98.
This run is preserved in `pre-optimization-luna-max.json`.

## First prompt iteration

The first required-gate rewrite produced 19/25 complete baseline scenarios and
22/25 complete shaped scenarios, so it failed the preset 90% shaped-scenario
threshold. It also revealed three issues:

- the prompt allowed a no-storage decision to displace completion of the
  current sensitive-log task;
- the permission-boundary case graded use of a safe style memory without saying
  that such a memory existed;
- the creative-boundary case graded explicit text/format validation without
  saying that those constraints existed.

The failed iteration is preserved in `iteration-1-luna-max.json`. Before the
second iteration, the prompt separated current completion, safe relevant-memory
application, and scope exclusion into independent checks. The two ambiguous
scenario inputs were clarified without changing their expected or forbidden
actions.

## Second prompt iteration

The second iteration passed the suite with 21/25 complete baseline scenarios and
24/25 complete shaped scenarios. Expected-action selection was 94/98 versus
97/98, with no forbidden selections. The remaining shaped miss treated secret
redaction and safe-pattern capture as sufficient while omitting the independent
action that completes the current one-off task. This result is preserved in
`iteration-2-luna-max.json`.

The third iteration therefore requires three independent action buckets whenever
they apply: complete the current result, enforce safety/scope/format boundaries,
and create reusable improvement. An action in one bucket cannot implicitly
substitute for another.

## Aborted third prompt iteration

The third iteration was stopped after the shaped sensitive-one-off case again
omitted current-task completion. At that point 25/25 was impossible, so the
remaining calls were not spent and no result file was produced. The diagnosis
was that unconditional language requiring next-run improvement caused Luna Max
to manufacture a reusable safe-pattern action even when the scenario explicitly
said the data was one-off and had no reuse value.

The fourth iteration makes current completion unconditional but reusable
improvement conditional on a durable signal. Explicitly one-off work must be
completed and made safe without inventing a memory, global rule, or reusable
asset merely to demonstrate shaping.

## Activation-specific comparison

General task quality and safety were separated from the behaviors that uniquely
show Agentic Shaping. The activation suite fixes 26 paired scenarios and 105
cycle-specific criteria across Detect, Capture, Structure, Apply, Verify,
Simplify, and Measure. Current-task completion and forbidden behavior remain
independent guardrails instead of inflating the activation score.

The final Luna Max run produced 16/26 complete baseline scenarios versus 25/26
shaped scenarios, and 82/105 versus 104/105 activation-action hits. The shaped
condition was better in 10 pairs, tied in 16, and worse in none. Both conditions
completed 27/27 current-task criteria and selected zero of 52 forbidden actions.

Twelve development cases were used for prompt iteration. Nine revealed holdout
cases exposed further misses and were then treated as development evidence. A
new five-case final holdout was frozen before its first final run; it produced
3/5 versus 5/5 complete scenarios and 16/20 versus 20/20 activation actions.
The shaped condition still missed one version-drift action, so the result is
reported as 25/26 rather than rounded or described as perfect.

The evaluation system itself was shaped during this work. A contaminated
baseline instruction was removed, ambiguous cases were clarified without
changing their expected actions, failed prompt iterations were preserved, and
small case filters were added before full reruns. When a long run lost completed
work at timeout, the runner gained a prompt/suite hash, per-call checkpoints,
resume, and one retry for transient failures. These are reusable validation
assets, not manual exceptions made to improve the displayed score.

## Final general regression

After the activation-specific comparison was frozen, the final public prompt was
run through all 25 general quality and safety scenarios again. Baseline selected
94/98 expected actions (95.9%) and shaped selected 96/98 (98.0%); neither selected
a forbidden action. Both variants missed one creative-boundary criterion and one
high-cost fail-fast criterion. This small general-quality gap is reported as a
regression guard, not presented as evidence of dramatic activation.

## Behavioral interlock development probe

On 2026-08-27, a repeated correction exposed a gap between remembering a work
preference and enforcing it: during a long self-host build, the Agent again
performed consecutive status polls even though safe low-load companion work
remained. `AS-BI-001` moves that mechanically decidable boundary into a runtime
interlock. While safe work remains, it blocks the first and every later poll
until fresh non-conflicting evidence for the exact selected action exists. It
also independently blocks a poll beyond the 60,000 ms budget. The harness owns both the pending-work count and
the monotonic `waitedMs` value, caps
the injected live state at 256 UTF-8 bytes, and rejects active-input mutation,
competing high-load work, status-only evidence, malformed events, and an
unexplained or model-invented empty queue.

The deterministic trace suite passed 23/23 positive and negative controls, and
the execution hook returned exit 0 for an allowed trace and exit 2 with
`AS-BI-001-IDLE-WAIT` for a blocked trace. A one-case GPT-5.6 Luna Max
development comparison then scored 4/4 for both baseline and shaped variants,
with current-task preservation 1/1 and zero forbidden actions. This tie is
important: the public prompt showed no advantage on the explicit scenario, so
the result is not evidence for a prompt improvement. It supports keeping the
public prompt lean and assigning hard enforcement to the runtime interlock.
The case remains outside the frozen 26-case public suite until a future prompt
change and full evaluation justify promotion.

The current artifact is a reusable contract and reference execution hook, not
evidence of product-wide Codex integration. A runtime gains the hard guarantee
only after its tool dispatcher invokes the hook before every wait/poll and
cannot bypass a blocked verdict.

A direct hook review then found two bypasses in the first prototype: evidence
did not have to match the harness-selected action, and the context budget was
checked only at start. Exact action matching, one-time evidence consumption,
and post-transition state-budget checks now have dedicated negative controls.
The trace shape is also published as JSON Schema, and an unknown-field negative
control prevents a harness or model from smuggling an unrecognized override
through a permissive parser.
An empty trace is rejected as invalid rather than being treated as an allowed
run with no evidence.
Completed evidence IDs are scoped to one run, so a later run may reuse the
same stable queue action ID without being misclassified as an in-run replay.

The first focused replay also revealed a validation-system defect: the runner
applied the public minimum-20-case rule to every suite, preventing small failure
replay. Explicit development mode now permits a small suite but cannot overwrite
published result filenames. A validate-only mode checks the suite, result path,
mode, and filter before model calls, and the documented PowerShell invocation
preserves the Node exit code across environment cleanup.

## LLM Wiki application trace development probe

On 2026-08-27, repeated Sollang compiler work exposed a second gap: successful
LLM Wiki retrieval could be reported without proving that each relevant memory
changed the current plan, artifact, and verification. `AS-LW-001` therefore
separates lookup from application. Its deterministic trace gate requires every
relevant memory to map to a current plan item plus action and verification
evidence, or to an explicit exclusion reason; irrelevant and sensitive memories,
current-task completion, and forbidden actions remain independent gates. The
positive and six negative controls passed 7/7.

The first fixed six-case Luna Max development run failed and is preserved
unchanged: baseline scored 23/23 and shaped 22/23, with one shaped scenario miss
and both variants completing only 5/6 task guards. Review showed two different
causes. The shaped zero-result response stated the missing-memory fact in its
reason and completion evidence but did not select the exact graded action. The
first scenario also made “complete current structure work” ambiguous beside a
forbidden local-only completion claim, so both variants omitted the task action.
This was treated as evaluator ambiguity, not prompt failure. The 0.1 suite,
failed result, result SHA-256, suite SHA-256, prompt SHA-256, and observed
checkpoint run key are preserved and independently verified.

The provenance repair itself exposed a resume-integrity defect: the historical
run key contained the suite name, declared version, and case IDs but not the
full suite content. Editing a scenario or graded action without changing those
three fields could therefore reuse a mismatched checkpoint. Run-key algorithm
version 2 includes the suite SHA-256. A deterministic control proves version 1
compatibility for preserved evidence and proves version 2 changes the key when
same-ID suite content changes.

Version 0.2 clarified the two action boundaries without changing the public
Slogs policy. Its paired run passed: baseline and shaped each selected 23/23
application actions, completed 6/6 task guards and 6/6 scenarios, and selected
zero forbidden actions, with no transient failures. All six pairs tied. This
supports leaving the public policy unchanged: the clarified probe found no
remaining behavioral defect, but the tie is not causal evidence that the policy
outperforms a capable baseline. The runner now embeds its run key and suite and
prompt SHA-256 values in every completed report so checkpoint deletion cannot
erase frozen-run identity.

A later public-prompt update exposed a second provenance boundary: the preserved
evaluation verifiers fetched the mutable policy URL and treated normal policy
advance as corruption of an immutable historical run. Historical integrity and
current-policy freshness are now separate gates. The default verifier checks the
frozen result and suite bytes, recorded hashes, and embedded provenance without
a network dependency or rewriting old evidence. `--check-current-prompt`
reports `currentPrompt=false` when the public URL has advanced, while
`--require-current-prompt` is the explicit freshness gate and rejects that same
stale run. The repaired historical checks passed 3/3, run-identity
compatibility passed 1/1, and the strict stale-prompt negative control passed
1/1 by failing closed.
The old runs did not archive their prompt bytes, so their prompt hash and run
key cannot be reconstructed independently after the mutable URL advances. The
verifiers now state that boundary instead of silently using today's bytes as
yesterday's evidence. The runner now writes exact prompt bytes to a
content-addressed `prompt-<sha256>.md` snapshot before model execution, embeds
that locator in completed provenance, refuses mismatched existing content, and
lets the completed-result verifier reconstruct both prompt hash and run key. The
content-addressing, idempotence, and corruption controls pass 3/3.

## Production-route evidence development probe

On 2026-08-27, Sollang C82 performance work exposed a third lookup-versus-
execution gap. A driver named for Typed IR had produced valid phase timings, but
source inspection proved that it called a sequential compatibility wrapper
instead of the native compiler entry route whose parallel speed was being
evaluated. The measurements were retained as diagnostics and excluded from the
acceptance comparison; renaming the driver or trusting its label would not have
repaired the evidence.

`AS-PR-001` freezes the reusable boundary. Each compared compiler execution must
match its own declared production command, driver, API, and capability route.
The workload input fingerprint and generated output hash and byte count must be
identical, the compiler fingerprints must differ, and each side must have at
least three samples. A diagnostic route receives `OK-DIAGNOSTIC` and cannot be
mistaken for production acceptance. The JSON Schema and deterministic runtime
gate passed nine positive and negative controls, including route, input, output,
unchanged compiler, insufficient samples, evidence authority, and unknown fields.

Applying the draft contract back to Sollang immediately found an overconstraint
in the first design: it required the baseline and candidate routes to equal each
other. That is wrong when the intended change replaces a sequential production
capability with a parallel one. The corrected contract instead compares each
observed route to that compiler version's declared production route. This is an
example of the full feedback loop rather than a one-way policy note: project
failure created a general contract, and the project case then corrected the
contract before it was treated as authoritative.

The focused scenario then ran against the live Korean Slogs policy
`2026.08.25.3` with GPT-5.6 Luna Max. Baseline and shaped variants both selected
5/5 expected actions, completed 1/1 current-task guard, and selected zero of
three forbidden actions; the single pair tied. The result preserves run-key
algorithm v2, suite SHA-256
`94da3ba1580b7698137e56266ce5d742d8df934b7b51700e9d4e242b3313705c`,
and live prompt SHA-256
`11437a033ff19486b319012e40e596b477e2af9d0738cb26a7f53d0af478bdc9`.
This revealed development case remains outside the frozen public suite and
denominators. The tie gives no evidence that the policy outperforms the capable
baseline and therefore does not justify a policy change. The runtime contract
likewise does not prove product-wide integration until an external benchmark
harness constructs route evidence from actual events instead of accepting a
model-authored JSON claim.

## Expensive-gate downstream audit probe

On 2026-08-29, a Sollang self-host ownership fix exposed a gap not covered by
the idle-wait interlock or the general high-cost fail-fast scenario. Each fresh
compiler rebuild cost about twelve minutes. The first repair updated the outer
partial-move detector but not its field-wise drop-glue consumer. Reviewing that
consumer avoided completing one already-doomed rebuild. The next complete
consumer patch still produced byte-identical bad LLVM because every consumer
shared a wrong temporal assumption: cleanup used the start of the `return` AST
as its cutoff, excluding an owned field move nested inside the returned value.
A cheap Typed IR program then proved that move site 33 and return node 29 shared
region 15, falsifying the region hypothesis before another rebuild. The final
source contract uses the AST end and the focused 1213 regression distinguishes
the old and corrected LLVM as whole-payload/remaining-field drop counts 1/0 and
0/1.

`AS-EG-001` captures the reusable boundary. Before a gate estimated at 60,000
ms or more, the harness must declare every changed contract and its complete
downstream consumer set, attach exactly one passing audit to each declared pair,
run both positive and negative cheap probes, and prove that active-input
fingerprints did not change during preflight. The deterministic suite passes
11/11 positive and negative controls. Its execution surface returns 0 for a
schema-valid complete trace and 2 with `AS-EG-001-CONSUMER-MISMATCH` for a
schema-valid trace missing the field-drop consumer. This is a local reference
hook, not proof that every Agent runtime invokes it, and no public prompt or
frozen model-evaluation denominator has been changed from this focused evidence.

## Stale-seed production-route application

On 2026-08-29, Sollang C97 showed why an apparently stronger early probe can be
invalid evidence when it runs on the wrong compiler generation. Four direct
attempts used the preceding installed Stage3 to compile a new self-host semantic
fixture. They failed in the fixture harness with imported `TypedIrNode` values
misclassified as `Text`, before the late-array candidate could execute. Treating
those failures as candidate evidence caused repeated three-to-seven-minute
rebuilds and obscured the actual owner layer.

Applying `AS-PR-001` changed the route to the declared approval chain: verified
SLG seed -> current compiler Stage1 -> focused fixture. The fixture was also
narrowed to its semantic owner, inspecting the canonical fixed-array type arena
without Typed IR. Its closure fell from 34,089 to 18,458 lines, focused emission
fell from the invalid harness's 442,175 ms to 191,214 ms, and the current Stage1
passed direct-call closure, LLVM assembly, exact execution, and the managed
differential. Natural fixture 1216 then emitted in 35 ms and the originating
GZIP byte-boundary fixture 1215 in 9,451 ms. This is additional real-project
evidence for the existing production-route and expensive-gate contracts, not a
new prompt claim or proof of product-wide runtime interposition.

## Direct-hook no-op negative control

During the same Sollang wait on 2026-08-29, the Agent repeatedly ran
`node evals/behavioral-interlock.mjs` immediately before polling and treated exit
0 as hook evidence. The module only exported the in-process evaluator; direct
execution evaluated no trace and silently exited successfully. The documented
`verify-behavioral-interlock.mjs --trace` adapter was valid, but the plausible
wrong command created false confidence at exactly the boundary the interlock was
meant to protect.

The runtime module now has a fail-closed direct CLI. It accepts exactly
`--trace <runtime-trace.json>`, emits the compact AS-BI-001 verdict, exits 0 for
ALLOW, 2 for BLOCK, and 64 when the trace is missing or malformed. Importing the
module remains side-effect free. The deterministic verifier independently
spawns the runtime in allowed, blocked, and no-argument modes; the expanded gate
passes 26/26 and proves that a no-op invocation can no longer masquerade as an
enforced hook. Localized public documentation and the Slogs-policy sync gate
also pass. This closes the reference-hook ambiguity but does not claim that an
Agent runtime globally interposes it; non-bypassable enforcement still requires
the runtime or orchestrator to supply harness-owned monotonic traces before each
wait/poll.

## Codex transport hook coverage boundary

On 2026-09-01, the official Codex hook surface made the remaining enforcement
gap precise. `PreToolUse` can intercept unified execution as `Bash`, inject the
companion-work contract, and block or rewrite the command before it starts.
However, `write_stdin` is transport for an already approved unified-exec
session; polling or sending input through it does not run `PreToolUse` again.
Installing only a Bash start hook therefore cannot prove that every later poll
passed AS-BI-001.

The repository now provides a reviewed start-time adapter and Windows-capable
configuration example under `hooks/`. The adapter states the gap in the model-
visible context instead of claiming hard enforcement. Its eight-case verifier
checks Bash injection, non-Bash silence, malformed-input fail-closed behavior,
Windows configuration, and the required prohibition on hook-only enforcement
claims. The existing 31-case behavioral interlock remains the authoritative
dispatcher contract. Complete enforcement still requires an orchestrator-owned
queue and trace around transport polls plus a Stop-time audit; the start hook is
only one layer of that composite control.
## 2026-09-01 — Structured artifacts were being mistaken for measured improvement

The long-running Sollang work already converted conversational defects into a
199-entry classified ledger, minimal regressions, focused verifiers, and a
22-axis standard-library progress manifest. Those are real Structure and Apply
evidence, but the audit exposed a missing boundary: creating and validating an
asset did not prove that the next diagnosis used less manual judgment, scanned
less input, failed earlier, retried less, or completed faster on the same input.

`AS-US-001` now separates three claims that had been easy to collapse:

1. a durable unstructured signal was detected;
2. it became an authoritative structured asset consumed by a real path; and
3. a frozen-input before/after metric improved.

The deterministic gate rejects prose-only and memory-only capture, unused
fixtures, input drift, unchanged metrics, self-authored traces, incomplete
current work, and forbidden actions. It permits an explicit no-structure
decision for one-off or irreducibly semantic judgment. This gate validates the
policy boundary; Sollang items without comparable before/after measurements
remain structured improvement candidates rather than measured improvements.

The next audit found that this honest candidate state existed only in prose:
the executable schema forced every structured asset to carry a completed
before/after measurement. Schema version 2 now makes the three reporting levels
machine-readable. `structured-and-applied` requires an executable frozen-input
measurement plan and returns its own non-causal success code;
`measured-improvement` alone returns the causal improvement code. Missing plans,
claim/evidence mismatches, and input drift fail closed. This lets long-running
Sollang work preserve real Structure and Apply progress without overstating the
unmeasured effect.

The first four-pair activation run passed all 14 shaping actions in the shaped
condition versus 12/14 in baseline, but failed the independent task gate at
3/4 in both conditions. The input-drift case asked whether a speed claim was
valid while grading the vague action `finish_the_current_analysis_request`;
both Agents correctly rejected the claim and selected all three verification
actions but did not select that unrelated label. The original failed result is
retained. Development suite 0.2 makes the current task explicit as completing
the improvement assessment; the focused pair then passed 3/3 shaping actions,
1/1 current-task action, and 0 forbidden actions in both conditions. This was
an evaluator-contract correction, not a prompt advantage.

Suite 0.3 then made the unused-asset task explicitly request integration and
measurement. Both variants selected the two material actions and both task
guards, but neither selected the redundant label
`mark_as_structured_improvement_candidate`; their reasons already preserved the
same honest incomplete status. Suite 0.4 removes that duplicate expected action
while retaining the independent status task guard, real-consumer integration,
frozen measurement, and no-premature-claim forbidden controls.

The corrected 0.4 full development run passed. Baseline selected 12/13 shaping
actions and 4/5 current-task guards; shaped selected 13/13 and 5/5, with zero
forbidden actions in both. The paired outcome was 1 shaped-better, 3 ties, and
0 shaped-worse. This is a small revealed development regression for one model
and prompt, not a final holdout or a universal performance claim.

## Invalid companion-evidence remediation probe

During the C247 Sollang Stage2 run, the first real AS-BI-001 trace used the
undeclared evidence kind `verification-contract`. The runtime correctly
returned `AS-BI-001-INVALID-EVIDENCE`, but the code alone required a repository
search to discover the accepted `contract-review` spelling. This was a durable
integration-friction signal rather than a reason to weaken evidence checks.

Contract schema version 4 therefore keeps the same fail-closed verdict and adds
an actionable `guidance` field plus the contract-owned
`allowedEvidenceKinds`. The negative control confirms that the list includes
ordinary and system-evolution evidence kinds while excluding status-only
messages. The deterministic suite now passes 32/32. This improves repairability
without treating the initial invalid trace, a progress message, or a memory
write as completed companion work.

## Generic artifact evidence schema and runtime parity

During the interrupted Sollang Stage2 continuation on 2026-09-03, the Agent
structured a concrete native-exact resume design under `artifacts/scratch/`
and supplied that path through the schema-allowed `artifactEvidence` field on
an ordinary `artifact` event. JSON-schema validation admitted the event, but
the runtime returned `AS-BI-001-INVALID-EVIDENCE` because it prohibited
`artifactEvidence` on every non-system event. The contract therefore had two
different answers for the same trace.

The runtime now validates any supplied artifact list as a non-empty collection
of non-blank strings and permits it on generic companion evidence. System
evolution remains stricter: it still requires both a supported `systemTarget`
and artifact evidence. Positive generic-artifact and negative empty-artifact
cases raise the deterministic suite to 34/34. This is schema/runtime parity;
it does not claim that naming an artifact proves its contents or that the
runtime globally intercepts Codex transport polls.

## Companion-evidence enum preflight documentation

The resumed Sollang exact gate later repeated the same integration class with
the shorter undeclared kind `contract`. The runtime again rejected it and
returned the correct `contract-review` alternative, so fail-closed behavior was
working. However, the public evaluation guide still described only the enum
returned after failure. A harness author therefore had to trigger a rejected
poll trace or inspect the JSON contract before learning every exact spelling.

The English evaluation guide and Korean localization authority now list all
eight accepted kinds before first use. The localization gate requires every
generated README to retain each code token, and the regenerated four-language
set plus the 34/34 interlock suite passes. This is a documented preflight and
generation regression improvement; it does not widen the evidence enum or
claim that documentation alone enforces a poll.

## First-poll exception drift between policy and the Codex adapter

During the continued Sollang native-exact wait on 2026-09-03, the Slogs policy
and AS-BI-001 runtime both required fresh evidence before every poll, including
the first. The Codex start-hook adapter nevertheless injected “After one
orientation poll,” which permitted exactly one no-op poll before companion
work. The hook was therefore weaker than both authorities even though its
transport-coverage disclaimer was accurate.

The adapter now requires the exact next queued action or a harness-owned empty-
queue proof before the first and every later poll. Its verifier adds positive
first-poll wording and negative orientation-exception checks and passes 10/10;
the authoritative behavioral interlock remains 34/34. The Slogs policy test
also rejects that exception and its focused suite passes 14/14. Finally, the
live policy-sync check requires the Korean and English first-poll clauses and
rejects contradictory exception wording against version 2026.09.03.1.

This change aligns the injected contract; it still does not make a start hook
intercept `write_stdin`. The current run is independently scored as in-progress
by AS-CR-001 so the system work cannot be used to claim that the primary
Sollang verification has completed.

## Pairwise tie was accepted as activation evidence

The focused interlock activation run scored 4/4 for both baseline and shaped
conditions. Although the observations correctly described that tie as no causal
evidence of improvement, the generic evaluation runner only required the shaped
condition not to underperform. It could therefore report the focused activation
suite as passed without demonstrating any shaped-only behavioral gain.

The suite now requires at least one shaped-better pair through
`shapedMinimumPairwiseWins`, and the generic runner evaluates that criterion
after computing the paired outcome. The previous tied result consequently no
longer qualifies for promotion. This strengthens evaluation honesty; it does
not claim that `write_stdin` transport is integrated. Promotion still requires
a fresh paired behavioral run with at least one real shaped win, zero forbidden
selections, and the independent task gate intact.

During validation of that change, a conventional `--validate-only` argument was
silently ignored because `run-evals.mjs` is configured exclusively through
`AGENTIC_SHAPING_EVAL_*` environment variables. The runner began a real Agent
evaluation and competed with the active Sollang verification until it was
stopped. The runner now rejects every CLI argument before loading the suite or
starting an Agent, and `verify-run-evals-cli-contract.mjs` proves both the
fail-fast path and the supported environment-configured validation path. This
turns an operator convention into an executable preflight contract.
