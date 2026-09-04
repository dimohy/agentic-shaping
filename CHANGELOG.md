# Changelog

Agentic Shaping uses Semantic Versioning. Compatible wording and bug corrections increment `patch`, backward-compatible capabilities increment `minor`, and incompatible public-contract changes increment `major`.

## [0.3.0] - 2026-09-04

### What changed for users

- Reusable working methods can now be discovered from repeated corrections, failures, and successful patterns.
- Project-specific details stay local, while broadly useful methods can be generalized safely across projects.
- A generalized method can be stored automatically in Slogs Skills as a review candidate after passing validation.
- Each skill asks once whether to apply to the current project, all projects, or remain disabled; accepted skills can follow the latest compatible validated version.
- Policy, evaluation, four localized homepages and READMEs, GitHub history, and release version now advance together from one release manifest.

### Technical notes

- Compatibility: this is a backward-compatible `minor` release from `0.2.0`; existing v0.2 workflows require no migration.
- Contracts: abstraction, privacy-safe package synthesis, candidate review state, first-use scope, version resolution, and multilingual publication synchronization now fail closed.
- Verification: Agentic Shaping abstraction and safety checks passed 25/25, lifecycle checks passed 17/17, and Slogs registry integration checks passed 36/36 with PostgreSQL integration 1/1; the full Slogs suite passed 251 tests with 22 skipped and no failures. Natural-language skill discovery was verified with all-token, order-independent matching and broad-query controls.
- Live integration: the operational Slogs MCP exposed all six registry methods, stored and validated `korean-software-terminology` 1.0.0, and withheld its content until the first-use scope is chosen.
- Known limitation: first-use scope (`project`, `global`, or `disabled`) is still undecided; this package is verified on Windows only, and external evidence locators are hash-bound but not fetched and rehashed by the registry.
- Detailed evidence: see [`evals/skill-abstraction-contract.json`](evals/skill-abstraction-contract.json), [`evals/skill-abstraction-traces.json`](evals/skill-abstraction-traces.json), and [`evals/skill-lifecycle-contract.json`](evals/skill-lifecycle-contract.json).
