# Reviewed media inputs: verify the consumer path

A media production workflow exposed three different defects: the temporary review stage omitted supporting inputs, a required spoken closing was omitted, and a pause plan could exist without being bound to the synthesis command. Recording preferences alone did not prevent these failures.

The production repository now stages the complete review file set before validation, rejects new main scripts without the required closing at the end, and checks that the actual synthesis `--script-file` belongs to the reviewed delivery inputs. Pause roles distinguish major transitions, minor transitions and brief breaths. Character changes preserve speech PCM while adding only the declared silence. An explicit selected-master resolver validates the approved voice identity, transcript and artifact hashes before synthesis; it does not silently regenerate or substitute a voice.

These are changes to the actual local production consumer. This public case study does not publish private source material, recordings, credentials or project scripts, and does not claim that every Agent automatically enforces the rules.

## Observed verification

- Review staging and plan/delivery checks: 49 executed cases, 48 passed and one filesystem symlink case skipped because symlink creation was unavailable. A skipped case is not a pass.
- PCM assembly: 13 focused cases passed, including exact 3-second transitions, same-concept short pauses, no-major-transition completion, and rejected unauthorized voice assignments.
- Selected-master and Fish pause behavior: 35 focused C# cases passed without making live synthesis requests in those fixtures.
- Supervisor: 10 focused cases passed, including nested log-directory preparation and rejection of unrelated environment overrides.
- Shared runtime preparation: four focused mocked cases passed; this alone is not a production speed measurement. Real runtime ownership, cleanup and end-to-end media completion remain separate checks.

## Measurement and limits

Five paired runs of the same review-staging input failed before the fix and succeeded after it. The median failed-path time was 0.016152 seconds; the median complete successful-path time was 0.039843 seconds. The earlier path exited before doing the required work. These figures demonstrate recovered correctness, **not a speedup**.

Repeated loading of a large speech model was also observed during production. The existing server-reuse capability was connected to the serial queue with explicit ownership, fixed inputs and cleanup. Any speed claim requires a comparison under the same workload and input conditions; timing different lines is not a valid comparison. Generation, perceptual review and publication must still satisfy the original completion criteria.

## Reusable decision

### A paused render reused verified work

When production resumed, the external storage mount was absent. The existing mount command restored access before any regeneration was attempted. The camera renderer now checks the saved input hashes, completed clip hashes, owned paths, dimensions and frame cadence before reusing a contiguous set of completed scenes. The actual production log confirmed reuse of eleven scenes and rendering continued at scene twelve. The interrupted twelfth clip was preserved separately and was not accepted as completed work.

Five focused cases passed against the same PowerShell functions consumed by the renderer. They cover unchanged work, changed inputs, changed clip bytes, invalid paths or cadence, and the producer's fractional final-frame boundary. Fixture tests do not establish media quality; the saved production clips were separately inspected and hash checked. A one-frame trim boundary is accepted only when the container duration matches its frame count. Missing additional frames remain an error.

This is observed recovery and reuse, not a measured end-to-end speedup. Final composition, perceptual review and private YouTube presentation remain separate completion criteria.

### A thumbnail correction reached the upload consumer

The next run mistakenly generated landscape covers for five vertical Shorts. The correction was applied to the selected assets and to the existing publication preparation function: a Shorts cover must have a 9:16 final image and a portrait original, while the parent thumbnail must remain 16:9. Cropping a landscape original into a portrait file cannot bypass this check. The function reads the actual images rather than trusting an aspect-ratio label in a receipt.

All six selected covers passed the integrated preparation command. The focused publication suite passed 23 cases, including normal portrait and landscape inputs, the previous landscape Shorts failure, a crop bypass, and conflicting visibility declarations. This proves preparation behavior and selected-input compliance. It does not prove that YouTube displays the intended cover, that a private video is publicly visible, or that the workflow is faster. Actual upload and displayed-cover verification remain separate.

Use direct editorial judgment for natural language and scene meaning. Reuse the existing synthesis, pause parser and PCM assembler. Promote only repeated, mechanically decidable omissions and input bindings to execution checks. Preserve source meaning and final listening/visual verification. Count verified outcomes rather than the number of documents or validators added.

## 한국어 요약

검토 원고에 규칙이 있다는 사실만으로 실제 생성에 적용됐다고 판단하지 않습니다. 검토한 파일의 위치·해시·필수 마무리·쉼 역할을 생성 명령의 실제 입력과 대조합니다. 한국어의 자연스러움과 장면의 의미는 직접 검토하고, 반복되는 누락과 입력 불일치는 기존 실행 경로에서 차단합니다. 실패 경로와 성공 경로의 시간은 같은 작업을 수행한 비교가 아니므로 속도 향상으로 보고하지 않습니다. 최종 청취·화면 검수와 업로드 완료는 별도로 확인합니다.
