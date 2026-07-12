import { readFileSync, readdirSync } from "node:fs";

const workflowDir = new URL("../.github/workflows/", import.meta.url);
const failures = [];
for (const file of readdirSync(workflowDir)) {
  if (!/\.ya?ml$/.test(file)) continue;
  const lines = readFileSync(new URL(file, workflowDir), "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const reference = line.match(/\buses:\s*([^\s#]+)/)?.[1];
    if (!reference || reference.startsWith("./") || reference.startsWith("docker://")) return;
    if (!/@[a-f0-9]{40}$/.test(reference)) failures.push(`${file}:${index + 1} ${reference}`);
  });
}

if (failures.length > 0) {
  console.error(`GitHub Actions must use immutable commit SHAs:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("All GitHub Actions references are pinned to commit SHAs.");
