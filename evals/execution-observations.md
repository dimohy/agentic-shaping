# Execution eval observations

## Invalid first attempt

The first execution comparison on 2026-08-21 produced 17% for both variants.
Inspection showed that the managed environment had reduced the requested
`workspace-write` sandbox to `read-only`; neither agent could modify the fixture.
That run was rejected as an environment failure rather than interpreted as a
prompt result.

The grader also incorrectly searched runtime data for an old version literal and
failed to restore the negative-test state before running the agent-created test.
Both deterministic grader defects were fixed before the valid comparison.

On 2026-08-25, the grader exposed a second source-scope defect: it searched every
PowerShell file, so a regression test that intentionally retained the old version
as negative-test data was counted as a production hardcode. The check now names
and scans only the four production entry/runtime-selection sources. Test fixtures
remain free to encode the obsolete value they are designed to reject.

## Earlier valid comparison

The rerun used separate disposable fixture copies and isolated temporary Codex
homes. Sandbox bypass was restricted to those disposable directories. The
baseline scored 5/6 (83%); the shaped run scored 6/6 (100%). See
the repository history for that run.

## Current v0.2 prompt rerun

After adding the prompt version line and correcting the source-scope defect, the
isolated rerun scored 6/6 (100%) for both baseline and shaped variants. This run
confirms no execution regression; equal scores do not establish prompt
superiority. See `latest-execution-results.json` for the current individual
checks and final messages.
