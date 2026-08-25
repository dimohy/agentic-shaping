# Behavioral eval observations

## Evaluation expansion

On 2026-08-25, the behavioral suite expanded from 6 to 25 distinct paired
scenarios: 5 normal cases, 9 edge cases, and 11 negative controls across 9
categories. Each full comparison runs 50 independent GPT-5.6 Luna agents at
max reasoning effort. Percentages are descriptive scores for the fixed suite,
not population estimates.

The shared baseline instruction originally repeated two target behaviors:
staying within scope and requiring actual completion evidence. Those cues were
removed before the Luna Max optimization runs so the baseline did not receive
part of the shaping treatment.

## Pre-optimization run

The original v0.2 prompt produced 20/25 complete baseline scenarios and 23/25
complete shaped scenarios. Expected-action selection was 92/98 versus 95/98.
This run is preserved in `pre-optimization-luna-max.json`.

## First prompt iteration

The first required-gate rewrite produced 19/25 complete baseline scenarios and
22/25 complete shaped scenarios, so it failed the preset 90% shaped-scenario
threshold. It also revealed three issues:

- the prompt allowed a no-storage decision to displace completion of the
  current sensitive-log task;
- the permission-boundary case graded use of a safe style memory without saying
  that such a memory existed;
- the creative-boundary case graded explicit text/format validation without
  saying that those constraints existed.

The failed iteration is preserved in `iteration-1-luna-max.json`. Before the
second iteration, the prompt separated current completion, safe relevant-memory
application, and scope exclusion into independent checks. The two ambiguous
scenario inputs were clarified without changing their expected or forbidden
actions.

## Second prompt iteration

The second iteration passed the suite with 21/25 complete baseline scenarios and
24/25 complete shaped scenarios. Expected-action selection was 94/98 versus
97/98, with no forbidden selections. The remaining shaped miss treated secret
redaction and safe-pattern capture as sufficient while omitting the independent
action that completes the current one-off task. This result is preserved in
`iteration-2-luna-max.json`.

The third iteration therefore requires three independent action buckets whenever
they apply: complete the current result, enforce safety/scope/format boundaries,
and create reusable improvement. An action in one bucket cannot implicitly
substitute for another.

## Aborted third prompt iteration

The third iteration was stopped after the shaped sensitive-one-off case again
omitted current-task completion. At that point 25/25 was impossible, so the
remaining calls were not spent and no result file was produced. The diagnosis
was that unconditional language requiring next-run improvement caused Luna Max
to manufacture a reusable safe-pattern action even when the scenario explicitly
said the data was one-off and had no reuse value.

The fourth iteration makes current completion unconditional but reusable
improvement conditional on a durable signal. Explicitly one-off work must be
completed and made safe without inventing a memory, global rule, or reusable
asset merely to demonstrate shaping.

## Activation-specific comparison

General task quality and safety were separated from the behaviors that uniquely
show Agentic Shaping. The activation suite fixes 26 paired scenarios and 105
cycle-specific criteria across Detect, Capture, Structure, Apply, Verify,
Simplify, and Measure. Current-task completion and forbidden behavior remain
independent guardrails instead of inflating the activation score.

The final Luna Max run produced 16/26 complete baseline scenarios versus 25/26
shaped scenarios, and 82/105 versus 104/105 activation-action hits. The shaped
condition was better in 10 pairs, tied in 16, and worse in none. Both conditions
completed 27/27 current-task criteria and selected zero of 52 forbidden actions.

Twelve development cases were used for prompt iteration. Nine revealed holdout
cases exposed further misses and were then treated as development evidence. A
new five-case final holdout was frozen before its first final run; it produced
3/5 versus 5/5 complete scenarios and 16/20 versus 20/20 activation actions.
The shaped condition still missed one version-drift action, so the result is
reported as 25/26 rather than rounded or described as perfect.

The evaluation system itself was shaped during this work. A contaminated
baseline instruction was removed, ambiguous cases were clarified without
changing their expected actions, failed prompt iterations were preserved, and
small case filters were added before full reruns. When a long run lost completed
work at timeout, the runner gained a prompt/suite hash, per-call checkpoints,
resume, and one retry for transient failures. These are reusable validation
assets, not manual exceptions made to improve the displayed score.

## Final general regression

After the activation-specific comparison was frozen, the final public prompt was
run through all 25 general quality and safety scenarios again. Baseline selected
94/98 expected actions (95.9%) and shaped selected 96/98 (98.0%); neither selected
a forbidden action. Both variants missed one creative-boundary criterion and one
high-cost fail-fast criterion. This small general-quality gap is reported as a
regression guard, not presented as evidence of dramatic activation.
