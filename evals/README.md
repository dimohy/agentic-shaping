# Agentic Shaping behavioral eval

This suite checks whether the exact public starter prompt changes an independent
Codex agent's action selection. It does not treat prompt text presence as proof.

Run:

```powershell
node .\evals\run-evals.mjs
node .\evals\run-execution-eval.mjs
```

The runner extracts `index.html#starter`, creates an isolated temporary Codex
home, runs the same five scenarios with and without the prompt, validates every
response against `response.schema.json`, and writes `latest-results.json`.

Passing requires:

- shaped expected-action recall of at least 90%;
- zero forbidden selections;
- no underperformance against the unshaped baseline.

The scenarios cover correction/style capture, recurring version drift,
reproducible analysis, canonical authority, and sensitive one-off information.
This is behavioral evidence for the tested Codex CLI/model environment, not a
claim that every model and tool environment will behave identically.

The second command performs a stronger execution test. It gives baseline and
shaped agents separate copies of a broken version-drift fixture, lets them edit
the files, and then independently runs all three launchers, a missing-runtime
negative test, a hard-code scan, and the agent-created regression test.
