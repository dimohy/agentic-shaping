# Verified task workflows — AS-WF-001

Select `catalog.v1.json` by the current task kind, with a reason. Keep mandatory
stages in order; explain optional omissions. A small one-off task uses the two
stage `simple-task` workflow. Selection needs Agent judgment; matching a kind
does not prove semantic suitability.

Run the selected plan through the actual stage consumer:

```sh
node scripts/run-workflow.mjs PLAN.json STATE.json --step define
node scripts/run-workflow.mjs PLAN.json STATE.json --resume --step implement
node scripts/run-workflow.mjs PLAN.json STATE.json --resume
```

The plan contains `schemaVersion:1`, a unique `runId`, `scopeAuthorized:true`,
`task:{kind,summary}`, `workflowId`, `selectionReason`, `omittedStages:[{id,reason}]`
and selected `stages`. Each stage declares `id`, input file paths, `actions`,
`checks:[{id,command}]`, `repairs`, `maxAttempts` (1..5) and `maxDurationMs`.
A command contains an actual executable path, argument array, working directory,
safe display label and timeout. No shell is added. Reuse project commands and
validators; do not write a fresh wrapper for each action. Scope flags never grant
permissions. Use idempotent actions for stages that may need re-execution; do not
put irreversible publishing in an unbounded repair loop.

Every display starts with the concrete task from the bound `plan.task.summary`,
in the user's language, naming the target and action. For example, use
`Sollang 표현식 검증 완료 캐시 234개 정리`; `간단한 작업` only identifies a workflow
category and is rejected as a task summary. The renderer takes the validated plan
at every transition, so an old task title is never copied from a previous state.
Task text is escaped to keep newlines and pipes from injecting table rows.

The runner then prints workflow identity, current stage and stage results from durable
state and updates `STATE.json.md`. Show that table in the conversation at stage
transitions, verification failure, rework, interruption, resume and completion.
Never replace it with manually invented checkmarks. Logs are separate under
`STATE.json.logs`; keep secrets out of commands, labels, inputs and logs.

Every selected stage needs a real verifier. Action success alone cannot complete
it or launch a successor. Failed verification invokes that stage's declared
repair and rechecks within fixed attempt/time limits. Without a repair command,
the runner stops `needs-rework`: inspect the actual source, correct it, then resume
the same state. An unchanged failed input cannot be blindly retried, and resume
does not reset budgets. Completed stages are reused only while declared inputs
and executable bytes match. Changed upstream inputs invalidate affected stages
and successors while retaining historical records and logs.

If inspection reveals a missing input dependency, retain the exact previous plan
and explicitly resume with `--replan-from PREVIOUS.json --reason TEXT`. This
operation only adds input dependencies; it cannot change task scope, stage order,
commands, expectations or budgets, or remove inputs. It records both plan hashes
and invalidates affected stages with their previous attempts preserved. A changed
plan without this explicit, constrained operation remains blocked.

Timeouts/cancellation terminate the active child tree. An abandoned lock or
interrupted child blocks resume until its process/state has been inspected; do
not delete a lock blindly. Failed, cancelled or unexecuted checks remain
unverified. This is enforcement inside this runner, not interception of all
commands in every Agent host. Remote Slogs validation checks supplied records;
it cannot certify remote process authenticity. Semantic/creative review still
requires the actual artifact, explicit judgment and the existing SOP evidence.

Verify actual execution and negative controls with:

```sh
node evals/verify-workflow-execution.mjs
```

Slogs provides `llm_wiki_workflow_catalog` and `llm_wiki_prepare_workflow` using the
same versioned catalog. Pass the **exact** plan JSON used by the runner and its
state JSON. Display accepted `renderedWorkflowText` unchanged. Omit state only
for initial selection; it displays pending stages and never completed execution.
