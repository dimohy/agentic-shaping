# Evidence-based editorial review SOP — AS-SOP-001

Purpose: replace unsupported quality-pass claims with a resumable review of the actual artifact. Use this SOP for recurring quality-sensitive work; do not add it to trivial one-off edits without a benefit.

Inputs: actual baseline, current artifact, source constraints, the project's existing pattern checker, and the original completion criteria. The consumer owns physical file identity and command execution evidence. The generic evaluator checks submitted copies only.

1. **Capture.** MUST preserve the real baseline and identify current input and SOP by SHA-256. MUST NOT invent an awkward before-example. A missing original must be reported as missing.
2. **Review.** MUST read each paragraph and sentence in context. Record keep/revise, a concrete observation, and a focus actually present in each sentence. Check meaning, audience, natural language and source fidelity. MUST NOT generate blanket approval notes or treat a pattern checker as an editor.
3. **Check.** MUST run the existing mechanical checker on the reviewed current input. Bind command, tool/rules, exit code and stdout/stderr fingerprints. Failure blocks continuation; no silent fallback or fabricated run.
4. **Verify.** MUST confirm complete ordered coverage, unchanged artifacts and evidence, and preserved scope. A changed input returns to review. Submit the report through `evals/sop-review.mjs --report <file>`, or attach `reviewWorkflow` to the existing `--cost-selection` route. A delivery plan marked `qualitySensitive: true` requires this report.
5. **Deliver.** Resume the project's original approval and production steps. Mechanical success does not certify subjective quality, independent review, actual Agent reading or enforcement in every host. Report skipped checks and remaining review honestly.

`--through review` accepts an intermediate review record only; it never grants final production authorization. Hosts must connect the final gate to their actual consumer. Freeze normal, previously failed and bypass cases before changing the workflow. Run `node evals/verify-sop-review.mjs` for the 22-case contract and actual AS-US-001 integration checks.

Reference consumer: LingoMotion binds local snapshots and actual checker logs to these stages and rejects live synthesis before provider work when review is pending. The case demonstrates that consumer; it does not establish universal adoption or perceptual quality.

Method references: [Strands Agent SOPs](https://aws.amazon.com/blogs/opensource/introducing-strands-agent-sops-natural-language-workflows-for-ai-agents/), [SOP-Agent](https://arxiv.org/abs/2501.09316), [intermediate programmatic checks](https://www.anthropic.com/research/building-effective-agents).
