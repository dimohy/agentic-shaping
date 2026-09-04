# Codex hook adapter

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
