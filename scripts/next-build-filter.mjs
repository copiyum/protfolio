#!/usr/bin/env node
import { spawn } from "node:child_process";

const child = spawn("next", ["build", "--webpack"], {
  shell: true,
  stdio: ["inherit", "pipe", "pipe"],
});

function stripAnsi(value) {
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}

function pipeFiltered(stream, output) {
  let pending = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (stripAnsi(line).includes('The "middleware" file convention is deprecated')) continue;
      output.write(`${line}\n`);
    }
  });
  stream.on("end", () => {
    if (pending && !stripAnsi(pending).includes('The "middleware" file convention is deprecated')) {
      output.write(pending);
    }
  });
}

pipeFiltered(child.stdout, process.stdout);
pipeFiltered(child.stderr, process.stderr);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
