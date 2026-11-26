# GPT-6.1 Terra paired execution comparison

Six real-file runs across three seeded programming tasks. Each arm used GPT-6.1 Terra High. The grader ran eight functional checks per task and separately checked whether the model wrote executable regression tests that caught the seeded defect.

| Task | Baseline functionality | Shaped functionality | Baseline regression | Shaped regression |
| --- | ---: | ---: | --- | --- |
| Localized release validation | 8/8 | 8/8 | Detected original defect | Detected original defect |
| Atomic transaction replay | 8/8 | 8/8 | Detected original defect | Detected original defect |
| Incremental build planning | 8/8 | 8/8 | Detected original defect | Detected original defect |

Totals: **24/24 baseline** and **24/24 shaped**. The shaped condition won 0, tied 3, and lost 0 tasks. Tests detected the original defect in 3/3 and 3/3 tasks, respectively.

## How the comparison ran

- [frozen.json](frozen.json) records the inputs, checks, order and timeout fixed before the scored runs. The shaped arm received the exact public English starter prompt from v0.8.2 plus the same task as the baseline. Neither arm had user configuration or personal work memory.
- Every attempt used a fresh Windows workspace and CLI home, with workspace-write sandboxing. Codex CLI 0.159.2 and Node.js 26.13.1 were used. Two preliminary host write failures were resolved using the standalone CLI sandbox before the scored runs.
- [tasks.json](tasks.json) contains the task descriptions. [runs](runs) contains the resulting code for each arm. [results.json](results.json) lists check verdicts and process metadata. Raw session logs and authentication material are excluded.
- A regression test only counts if the model-written tests pass on the repaired code and at least one fails when the frozen broken entry point is restored. The six runs offer a descriptive comparison; they do not establish a broader effect or measure the effect of personal memory.

## Replay the recorded scores

From the repository root with Node.js 26.13.1:

```sh
node evals/terra-paired/replay.mjs
```

The replay checks the archived source hashes, reruns the frozen independent grader, and tests each candidate and its seeded mutation in a temporary directory. To perform new model runs, copy each seed into a fresh workspace, use the task text and the common workspace-scope instruction below, and match the model and ordering in frozen.json. Prefix only the shaped arm with starter-v0.8.2.txt, then a blank line and the line Current task:. Use an authenticated isolated CLI home with no user configuration or hooks.

> Stay within this synthetic workspace. Do not read or modify unrelated files.

Process wall times and token counts are recorded for transparency. They are not a controlled speed or cost benchmark.
