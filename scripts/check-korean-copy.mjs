import { readFile } from "node:fs/promises";

const [html, rulesText] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../copy/ko-style.json", import.meta.url), "utf8"),
]);

const rules = JSON.parse(rulesText);
const failures = rules.forbiddenPhrases.filter(({ text }) =>
  html.includes(text),
);

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`${failure.id}: ${failure.text} - ${failure.reason}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Korean copy check passed (${rules.forbiddenPhrases.length} regression rules).`,
  );
}
