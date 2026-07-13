#!/usr/bin/env node
// Director-side triage of a Codex run report. Mechanizes the consistency
// checks the director runs on every landing and emits the re-run checklist.
// This does NOT replace independent verification — it organizes it: every
// binding gate still gets re-run by the director (trap 4).
//
// Usage: node verify-codex-report.mjs <RUN_DIR | report.json> [--packet <packet.md>]
// Exit: 0 = internally consistent, 1 = inconsistencies found, 2 = usage error.

import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
if (!target) {
  console.error("usage: verify-codex-report.mjs <RUN_DIR | report.json> [--packet <packet.md>]");
  process.exit(2);
}
let reportPath = target;
let packetPath = args.includes("--packet") ? args[args.indexOf("--packet") + 1] : "";
if (existsSync(target) && statSync(target).isDirectory()) {
  reportPath = join(target, "report.json");
  if (!packetPath && existsSync(join(target, "meta"))) {
    const meta = readFileSync(join(target, "meta"), "utf8");
    packetPath = (meta.match(/^handoff_doc=(.+)$/m) || [])[1] || "";
  }
}

const problems = [];
const notes = [];
let r;
try {
  r = JSON.parse(readFileSync(reportPath, "utf8"));
} catch (e) {
  console.log(`FAIL: report unreadable/unparseable: ${e.message}`);
  process.exit(1);
}

for (const f of ["status", "summary", "files_touched", "commands_run", "validation", "code_review", "risk_level", "blockers", "decision_needed"]) {
  if (!(f in r)) problems.push(`missing schema field: ${f}`);
}

const failedVal = (r.validation || []).filter((v) => v.passed === false);
if (r.status === "complete" && failedVal.length) {
  problems.push(`status=complete but ${failedVal.length} validation check(s) failed: ${failedVal.map((v) => v.check).join(" | ")}`);
}
if (r.status === "complete" && (r.blockers || []).length) {
  problems.push(`status=complete but blockers nonempty: ${JSON.stringify(r.blockers)}`);
}
const dud = r.status === "blocked" && !(r.files_touched || []).length && (r.commands_run || []).length <= 1;
if (dud) problems.push("DUD signature: blocked with zero work (clean-tree balk, not a divergence — re-fire, do not count toward the two-strike stop)");

// "code" means LANDED source files — not data/artifact outputs (var/),
// throwaway probe scripts (/tmp, /private/tmp), or files deleted before landing
const touchedCode = (r.files_touched || []).some(
  (f) =>
    /\.(ts|tsx|js|mjs|cjs|py|php|sh|sql|yml|yaml)$/.test(f.path || "") &&
    !/^var\//.test(f.path || "") &&
    !/(^|\/)(private\/)?tmp\//.test(f.path || "") &&
    !/^\/tmp\//.test(f.path || "") &&
    f.change !== "deleted"
);
if (touchedCode && r.code_review && r.code_review.performed === false) {
  problems.push("non-markdown files touched but code_review.performed=false (preamble mandates a review pass for code changes)");
}
const openFindings = ((r.code_review || {}).findings || []).filter((f) => !/fixed|no_change|acknowledged/i.test(f.resolution || ""));
if (openFindings.length) notes.push(`code-review findings not marked fixed: ${openFindings.length}`);
if ((r.decision_needed || []).length) notes.push(`DECISION NEEDED (${r.decision_needed.length}): ${JSON.stringify(r.decision_needed)}`);
if ((r.blockers || []).length && r.status !== "complete") notes.push(`blockers: ${JSON.stringify(r.blockers)}`);
if (r.risk_level && r.risk_level !== "low") notes.push(`risk_level=${r.risk_level}: ${r.risk_rationale || ""}`);

// Director re-run checklist from the packet's gates section
if (packetPath && existsSync(packetPath)) {
  const pk = readFileSync(packetPath, "utf8").split("\n");
  const gates = [];
  let inGates = false;
  for (const l of pk) {
    if (/^##.*(Validation|binding gates|Gates)/i.test(l)) { inGates = true; continue; }
    if (inGates && /^## /.test(l)) inGates = false;
    if (inGates && /^\s*(-|\d+\.)\s+\S/.test(l)) gates.push(l.trim());
  }
  if (gates.length) {
    console.log("DIRECTOR RE-RUN CHECKLIST (re-run every binding gate yourself; trap 4):");
    const valText = JSON.stringify(r.validation || []);
    for (const g of gates) {
      const cmd = (g.match(/`([^`]+)`/) || [])[1] || "";
      const mentioned = cmd && valText.includes(cmd.slice(0, 40));
      console.log(`  [${mentioned ? "reported" : "NOT IN REPORT"}] ${g}`);
    }
  }
} else if (packetPath) {
  notes.push(`packet not found at ${packetPath} — no re-run checklist extracted`);
}

for (const n of notes) console.log(`NOTE: ${n}`);
for (const p of problems) console.log(`FAIL: ${p}`);
console.log(
  problems.length
    ? `REPORT INCONSISTENT: ${problems.length} problem(s) — status=${r.status}`
    : `REPORT CONSISTENT: status=${r.status}, ${(r.validation || []).length} validation entries, ${(r.files_touched || []).length} files touched`
);
process.exit(problems.length ? 1 : 0);
