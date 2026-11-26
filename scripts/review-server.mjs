import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Reuse only the authorized OpenAI configuration, never other service credentials.
const source = process.env.FOCUS_OPENAI_ENV_SOURCE;
if (source) {
  const values = parseEnv(await readFile(source, "utf8"));
  for (const key of ["OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_ANALYSIS_MODEL"]) {
    if (!process.env[key] && values[key]) process.env[key] = values[key];
  }
}
process.env.FOCUS_LOCAL_REVIEW = "true";
// Time-limited opt-in for the owner's separately authorized integration test.
// The bridge itself also checks the exact technical record and Focus mailbox.
try {
  const optIn=JSON.parse(await readFile(new URL("../outputs/connected-review.enabled.json",import.meta.url),"utf8"));
  const until=Date.parse(optIn.expiresAt);
  if(optIn.enabled===true&&typeof optIn.email==="string"&&until>Date.now()&&until-Date.now()<=7200000){process.env.FOCUS_CONNECTED_REVIEW="true";process.env.FOCUS_CONNECTED_REVIEW_EMAIL=optIn.email;}
}catch{ /* Default local review remains read-only. */ }
process.env.OPENAI_MODEL ||= process.env.OPENAI_ANALYSIS_MODEL || "gpt-5-mini";
if (process.env.OPENAI_API_KEY && process.env.FOCUS_ASSISTANT_FIXTURE !== "true") {
  try {
    const check = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(process.env.OPENAI_MODEL)}`, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(15000) });
    process.env.FOCUS_OPENAI_AUTHENTICATED = check.ok ? "true" : "false";
  } catch { process.env.FOCUS_OPENAI_AUTHENTICATED = "unknown"; }
}
console.log(`Focus · revisión local · ${process.env.FOCUS_ASSISTANT_FIXTURE === "true" ? "simulación explícita de QA" : process.env.FOCUS_OPENAI_AUTHENTICATED === "true" ? "OpenAI validado" : "OpenAI pendiente de una configuración válida"}`);
const child = spawn(process.execPath, [fileURLToPath(new URL("./run-vinext.mjs", import.meta.url)), "dev", "--host", "127.0.0.1", "--port", process.env.FOCUS_REVIEW_PORT || "8130"], { stdio: "inherit", env: process.env });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
