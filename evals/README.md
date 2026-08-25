# Agentic Shaping behavioral eval

These suites check whether the exact public starter prompt changes an independent
Codex agent's behavior. Prompt text presence is never treated as proof.

Run:

```powershell
$env:AGENTIC_SHAPING_EVAL_SUITE='activation-cases.json'
$env:AGENTIC_SHAPING_EVAL_RESULT='activation-latest-results.json'
node .\evals\run-evals.mjs
Remove-Item Env:AGENTIC_SHAPING_EVAL_SUITE,Env:AGENTIC_SHAPING_EVAL_RESULT

node .\evals\run-evals.mjs
node .\evals\run-execution-eval.mjs
```

The first command runs the Agentic Shaping activation suite. It contains 26
paired scenarios and separately grades 105 shaping-specific behaviors, 27
current-task completion criteria, and 52 forbidden behaviors. Its result is
`activation-latest-results.json`.

The second `run-evals` command runs the broader 25-scenario quality and safety
regression suite and writes `latest-results.json`. The third command performs an
actual file-editing execution test.

The runner extracts `index.html#starter`, creates an isolated temporary Codex
home, explicitly uses GPT-5.6 Luna at max reasoning effort, validates every
response against `response.schema.json`, and writes a result after the full run.
Each completed agent call is checkpointed. Resume is allowed only when the suite,
prompt, model, reasoning effort, and case-list hash match. A timeout is recorded
as an environment failure and retried once.

Passing requires:

- shaped expected-action recall of at least 90%;
- shaped complete-scenario rate of at least 90%;
- 100% current-task completion when the suite defines a task guard;
- zero forbidden selections;
- no underperformance against the unshaped baseline.

The activation result was 16/26 (61.5%) to 25/26 (96.2%) for complete shaping
scenarios and 82/105 (78.1%) to 104/105 (99.0%) for individual shaping actions.
Both variants completed 27/27 current-task guards and selected no forbidden
behavior. This is descriptive evidence for this fixed suite and runtime, not a
population estimate or a claim that every model and tool environment behaves
identically.

The final 25-scenario general quality and safety regression scored 94/98 (95.9%)
for baseline and 96/98 (98.0%) for shaped, with no forbidden selections. Its
small gap is intentionally not used as the activation headline.

The second command performs a stronger execution test. It gives baseline and
shaped agents separate copies of a broken version-drift fixture, lets them edit
the files, and then independently runs all three launchers, a missing-runtime
negative test, a hard-code scan, and every recursively discovered agent-created
PowerShell regression test. A process timeout/nonzero exit is recorded separately
and cannot hide a failing artifact check.

`behavioral-observations.md` and the preserved iteration JSON files document
failed prompt iterations, evaluator ambiguity, baseline contamination, targeted
failure replay, holdout revisions, and the checkpoint/resume improvement. This
validation-system evolution is itself an Agentic Shaping example: repeated
manual diagnosis became a reusable, fail-fast evaluation pipeline.
