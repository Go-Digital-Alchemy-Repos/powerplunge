#!/usr/bin/env node
// Packet linter for the two-agent loop. Mechanically enforces the packet
// rules that used to live as prose in the template checklist and
// codex-traps.md. Run automatically by codex-handoff.sh preflight.
//
// Usage: node lint-packet.mjs <packet.md> [--ci <path-to-ci.yml>] [--project-dir <dir>]
// Exit: 0 = pass (warnings allowed), 1 = failures, 2 = usage/read error.
//
// Waivers: a packet line `LINT-WAIVE: <RULE> <reason>` suppresses that rule
// for the whole packet; waivers are printed loudly so the director owns them.
//
// Lane declaration (required): a line `Lane: <token>[, <token>...]` with
// tokens from: implementation, research, review, hostops, db-read, visual.

import { readFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const packetPath = args.find((a) => !a.startsWith("--"));
if (!packetPath) {
  console.error("usage: lint-packet.mjs <packet.md> [--ci <ci.yml>]");
  process.exit(2);
}
const pdFlag = args.indexOf("--project-dir");
const projectDir = pdFlag !== -1 ? args[pdFlag + 1] : "";
// Relative workspace paths only misresolve when Codex's cwd is NOT the
// workspace (trap 27); when the run's project dir IS the workspace, skip L1.
const cwdIsWorkspace = /core-platform-work\/?$/.test(projectDir);
const ciFlag = args.indexOf("--ci");
const CI_CANDIDATES =
  ciFlag !== -1
    ? [args[ciFlag + 1]]
    : [
        "/Users/thomascarney/Projects/core-platform-agent-native/.github/workflows/ci.yml",
        "/Users/thomascarney/Projects/core-platform-agent-native-lane2/.github/workflows/ci.yml",
      ];

let text;
try {
  text = readFileSync(packetPath, "utf8");
} catch (e) {
  console.error(`cannot read packet: ${e.message}`);
  process.exit(2);
}
const lines = text.split("\n");
const failures = [];
const warnings = [];
const waived = new Map(); // rule -> reason
for (const l of lines) {
  const m = l.match(/^LINT-WAIVE:\s*(L\d+)\s+(.+)$/);
  if (m) waived.set(m[1], m[2]);
}
function fail(rule, lineNo, msg) {
  if (waived.has(rule)) return;
  failures.push({ rule, lineNo, msg });
}
function warn(rule, lineNo, msg) {
  if (waived.has(rule)) return;
  warnings.push({ rule, lineNo, msg });
}
function findLine(re) {
  for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
  return 0;
}

const KNOWN_LANES = ["implementation", "research", "review", "hostops", "db-read", "visual"];

// L0 — lane declaration
const laneLine = lines.find((l) => /^Lane:\s*/i.test(l));
let lanes = [];
if (!laneLine) {
  fail("L0", 1, "no `Lane:` declaration (tokens: " + KNOWN_LANES.join(", ") + ")");
} else {
  lanes = laneLine
    .replace(/^Lane:\s*/i, "")
    .split(/[,\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const bad = lanes.filter((t) => !KNOWN_LANES.includes(t));
  if (bad.length) fail("L0", findLine(/^Lane:/i), `unknown lane token(s): ${bad.join(", ")}`);
}
const has = (lane) => lanes.includes(lane);

// L1 — workspace paths must be absolute (trap 27). The workspace-only
// subtrees are planning/research|loop|handoffs; the product repo's own
// planning/ holds only why.md and pre-cutover-prerequisites.md.
if (!cwdIsWorkspace) lines.forEach((l, i) => {
  if (/^LINT-WAIVE:/.test(l)) return;
  const m = l.match(/(^|[^/\w])(planning\/(research|loop|handoffs)\/[^\s`")\]]*)/);
  if (m && !l.includes("/Users/thomascarney/Projects/core-platform-work/" + m[2].split("...")[0].slice(0, 9))) {
    // absolute form appears elsewhere on the same line? check simply:
    if (!l.includes("core-platform-work/planning/")) {
      fail("L1", i + 1, `relative workspace path \`${m[2]}\` — must be absolute (trap 27)`);
    }
  }
});

// L2 — parity oracle only in --check mode (trap 2)
if (/verify-render-parity/.test(text)) {
  if (!text.includes("--check var/pipeline-hardening/render-parity-ref.pre-f03.json")) {
    fail(
      "L2",
      findLine(/verify-render-parity/),
      "parity oracle referenced without the binding `--check var/pipeline-hardening/render-parity-ref.pre-f03.json` invocation (trap 2)"
    );
  }
}

// L3 — plain `npm install` fails in this repo (trap 25)
lines.forEach((l, i) => {
  if (/\bnpm install\b/.test(l) && !/--package-lock-only/.test(l) && !/--legacy-peer-deps/.test(l)) {
    fail("L3", i + 1, "plain `npm install` fails (ERESOLVE, trap 25); use `npm ci` or `npm install --package-lock-only --ignore-scripts --legacy-peer-deps`");
  }
});

// L4 — e2e is not a binding gate (trap 3)
if (/test:e2e/.test(text) && !/not a (reliable )?gate|diagnostic/i.test(text)) {
  fail("L4", findLine(/test:e2e/), "e2e referenced without a `diagnostic` / `not a gate` caveat (trap 3)");
}

// L5 — continuation/rev packets use the delta format (retro rec 2)
const base = packetPath.split("/").pop() || "";
const isReviewLane = /^Lane:\s*review\b/im.test(text);
const isContinuation =
  !isReviewLane &&
  (/(^|[-_])(rev\d*|cont\d*|continuation|remediation)([-_.]|$)/i.test(base) ||
  /^#.*\b(rev\s?\d+|continuation|remediation)\b/im.test(text));
if (isContinuation) {
  for (const h of ["## Current delta", "## Preserved decisions", "## Banked facts"]) {
    if (!text.includes(h)) fail("L5", 1, `continuation packet missing required section \`${h}\` (delta format)`);
  }
  // delta sections stay bounded
  let cur = null, count = 0;
  lines.forEach((l, i) => {
    if (/^## /.test(l)) {
      if (cur && count > 20) warn("L5", i, `section \`${cur}\` exceeds 20 lines (${count}) — trim or waive`);
      cur = ["## Current delta", "## Preserved decisions", "## Banked facts"].includes(l.trim()) ? l.trim() : null;
      count = 0;
    } else if (cur) count++;
  });
}

// L6 — self-containment: never send Codex to another packet file (trap 16)
lines.forEach((l, i) => {
  if (/re-read.*(packet|handoff)/i.test(l)) fail("L6", i + 1, "packet tells Codex to re-read a prior packet — inline the content instead (trap 16)");
  else if (/(read|see|per|follow)\b[^\n]*planning\/handoffs\//i.test(l) && !l.includes(base))
    warn("L6", i + 1, "references another handoff file — packets must be self-contained (trap 16)");
});

// L7 — CI commands verbatim for implementation packets (trap 26)
if (has("implementation")) {
  const packetVitest = lines
    .map((l, i) => ({ l: l.trim().replace(/\s+/g, " "), i }))
    .filter(({ l }) => /npx vitest run/.test(l));
  if (packetVitest.length) {
    const ciPath = CI_CANDIDATES.find((p) => p && existsSync(p));
    if (!ciPath) {
      warn("L7", 0, "no ci.yml found to check vitest commands against");
    } else {
      const ci = readFileSync(ciPath, "utf8");
      const ciCmds = ci
        .split("\n")
        .filter((l) => /vitest run/.test(l))
        .map((l) => l.replace(/^\s*(-\s*)?run:\s*/, "").trim().replace(/\s+/g, " "));
      const anyVerbatim = packetVitest.some(({ l }) => ciCmds.some((c) => l.includes(c)));
      const labeledSubset = /\b(subset|scoped|quick check|not the merge gate)\b/i.test(text);
      if (!anyVerbatim && !labeledSubset) {
        fail(
          "L7",
          packetVitest[0].i + 1,
          `vitest command(s) match neither the CI hermetic command in ${ciPath} nor carry a 'subset'/'not the merge gate' label (trap 26)`
        );
      }
    }
  }
}

// L8 — direct DB reads carry the RLS warning (trap 1)
if (has("db-read") && !/RLS|app\.tenant_id/i.test(text)) {
  fail("L8", 1, "db-read lane without the RLS warning (empty is not absent; trap 1)");
}

// L9 — hostops packets derive command policy from the tool's actual surface (trap 28)
if (has("hostops") && !/command surface|call sites|approved forms/i.test(text)) {
  fail("L9", 1, "hostops lane without command-surface evidence (enumerate the mandated tool's call sites; trap 28)");
}

// L10 — review packets cite the waived-findings register
if (has("review") && !/findings-waived\.md/.test(text)) {
  fail("L10", 1, "review lane without a findings-waived.md citation");
}

// L11 — binding gates section present
if (!/^##.*(Validation|binding gates|Gates)/im.test(text)) {
  fail("L11", 1, "no `## Validation` / binding-gates section — every packet states its mechanical success condition");
}

// L13 — visual lanes need a computed gate (trap 19)
if (has("visual") && !/\b(DOM|hash|computed|byte-identical|HTTP assert)/i.test(text)) {
  fail("L13", 1, "visual lane without a computed hard gate (DOM/hash/HTTP); perception tools are last-resort only (trap 19)");
}

// L14 — obvious secret material (never print secrets)
lines.forEach((l, i) => {
  if (/(password|secret|token)\s*=\s*[^\s<${][^\s]{7,}/i.test(l) || /AKIA[0-9A-Z]{16}/.test(l)) {
    warn("L14", i + 1, "line looks like it embeds a secret value — packets must reference secret NAMES, never values");
  }
});

// Report
for (const [rule, reason] of waived) console.log(`WAIVED ${rule}: ${reason}`);
for (const w of warnings) console.log(`WARN ${w.rule}${w.lineNo ? ` (line ${w.lineNo})` : ""}: ${w.msg}`);
for (const f of failures) console.log(`FAIL ${f.rule}${f.lineNo ? ` (line ${f.lineNo})` : ""}: ${f.msg}`);
if (failures.length) {
  console.log(`LINT FAIL: ${failures.length} failure(s), ${warnings.length} warning(s) — ${packetPath}`);
  process.exit(1);
}
console.log(`LINT PASS: 0 failures, ${warnings.length} warning(s) — ${packetPath}`);
