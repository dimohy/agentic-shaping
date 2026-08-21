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

## Valid comparison

The rerun used separate disposable fixture copies and isolated temporary Codex
homes. Sandbox bypass was restricted to those disposable directories. The
baseline scored 5/6 (83%); the shaped run scored 6/6 (100%). See
`latest-execution-results.json` for the individual checks and final messages.
