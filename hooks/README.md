# Codex hook adapter

## Cost-aware diagnostic launch

For repeated expensive diagnosis, use `node scripts/launch-diagnostic.mjs PLAN NEW_RESULT --check` before the project's supervised runner, or `--launch` to invoke the command frozen in that plan. `AS-DC-001` checks hash-bound previous records, an explicit cumulative whole-input budget, exhaustive discriminating outcomes, trace coverage/capacity and the existing source-review/focused-reproduction/checkpoint-reuse alternatives. Available cheaper suitable work takes priority. A diagnostic result cannot close original acceptance or shorten its input/timeout contract. See `evals/diagnostic-continuation-contract.json`; verify with `node evals/verify-diagnostic-continuation.mjs`.

The plan must come from a trusted project adapter that inventories actual run records and scope. Arbitrary model-authored plans are not independent evidence. The wrapper delegates process supervision to the project's existing runner. It does not intercept other commands or install a global Codex hook. The Sollang C527 adapter binds its durable history and stops further whole-input runs until focused evidence changes its continuation contract.

`codex-pretooluse-companion-queue.mjs` injects the `AS-BI-001` companion-work
contract when Codex starts a shell command. Copy or merge
`codex-hooks.example.json` into the desired Codex hook scope only after reviewing
and trusting the command.

This adapter is a start-time guardrail, not a complete wait dispatcher. Codex
does not run `PreToolUse` again for `write_stdin` transport polls on an existing
unified-exec session. A harness that needs hard enforcement must construct the
authoritative `behavioral-interlock.mjs` trace around its poll dispatcher and
retain a Stop-time audit. The hook must never be cited as proof that those polls
were intercepted.

Verify the adapter with:

```powershell
node .\evals\verify-codex-wait-hook.mjs
```
