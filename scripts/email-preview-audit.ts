#!/usr/bin/env npx tsx

import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

type SeedTemplate = {
  key: string;
  name: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  isEnabled: boolean;
};

type PreviewArtifact = {
  slug: string;
  key: string;
  title: string;
  source: string;
  subject: string;
  html: string;
  text?: string;
  htmlPath?: string;
};

type LinkAuditResult = {
  preview: string;
  url: string;
  status: number | null;
  ok: boolean;
  note?: string;
};

type SendResult = {
  preview: string;
  success: boolean;
  messageId?: string;
  error?: string;
};

const runDate = new Date().toISOString().slice(0, 10);
const outputDir = path.resolve(process.cwd(), `tmp/email-preview-audit/${runDate}`);
const configuredBaseUrl = process.env.PUBLIC_SITE_URL?.trim() || "";
const baseUrl = (configuredBaseUrl || "https://powerplunge.com").replace(/\/+$/, "");
const skipArtifacts = process.env.EMAIL_PREVIEW_SKIP_ARTIFACTS === "1";
const skipLinkAudit = process.env.EMAIL_PREVIEW_SKIP_LINK_AUDIT === "1";
const shouldAuditLinks = !!configuredBaseUrl && !skipLinkAudit;
const sendTo = process.env.EMAIL_PREVIEW_SEND_TO?.trim() || "";

const sampleValues: Record<string, string> = {
  ADMIN_ORDER_URL: `${baseUrl}/admin/orders`,
  CARRIER: "UPS",
  CART_ITEMS_HTML: "<ul><li>Power Plunge XL x 1 - $2,495.00</li></ul>",
  CART_URL: `${baseUrl}/checkout?cart=preview`,
  CHECKOUT_URL: `${baseUrl}/checkout?recover=preview`,
  COMPANY_NAME: "Power Plunge",
  CUSTOMER_EMAIL: "avery@example.com",
  CUSTOMER_NAME: "Avery Carter",
  CUSTOMER_PHONE: "(555) 010-0142",
  ERROR_MESSAGE: "Card declined by issuer",
  ORDER_DATE: "June 29, 2026",
  ORDER_ITEMS_HTML: "<ul><li>Power Plunge XL x 1 - $2,495.00</li></ul>",
  ORDER_ITEMS_TEXT: "Power Plunge XL x 1 - $2,495.00",
  ORDER_NUMBER: "PP-10042",
  ORDER_TOTAL: "2495.00",
  REFUND_AMOUNT: "2495.00",
  RESET_URL: `${baseUrl}/reset-password?token=preview-token`,
  SHIPPING_ADDRESS: "Avery Carter<br>123 Cold Plunge Way<br>Austin, TX 78701",
  SHOP_URL: `${baseUrl}/shop`,
  SUPPORT_EMAIL: "support@powerplunge.com",
  TRACKING_NUMBER: "1Z999AA10123456784",
  TRACKING_URL: "https://www.ups.com/track?tracknum=1Z999AA10123456784",
};

const sourceScanPaths = [
  "server/src/services/customer-email.service.ts",
  "server/email.ts",
  "server/src/services/support-email.service.ts",
  "server/src/auth/betterAuthEmail.ts",
  "server/src/routes/admin/affiliates.routes.ts",
  "server/src/routes/public/payments.routes.ts",
  "server/src/services/checkout-recovery.service.ts",
  "server/src/services/error-alerting.service.ts",
  "server/src/services/revenue-monitoring.service.ts",
];

function printUsage(): void {
  console.log(`Usage: npm run email:preview:audit

Environment:
  PUBLIC_SITE_URL                 Base URL used for internal link rendering and audits
  EMAIL_PREVIEW_SKIP_ARTIFACTS=1  Skip writing tmp/email-preview-audit artifacts
  EMAIL_PREVIEW_SKIP_LINK_AUDIT=1 Skip HTTP checks for internal links
  EMAIL_PREVIEW_SEND_TO=<email>   Send each preview to one review inbox as a real email side effect

Notes:
  - Default run is static/offline: no DB writes, no provider calls, no real email sends.
  - EMAIL_PREVIEW_SEND_TO imports the real email service and sends through configured email provider.`);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapTextHtml(text: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,sans-serif;">
<pre style="max-width:680px;margin:0 auto;padding:24px;background:white;border:1px solid #e5e7eb;white-space:pre-wrap;line-height:1.5;">${escapeHtml(text)}</pre>
</body>
</html>`;
}

function replaceMergeTags(value: string): string {
  return value.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => sampleValues[key] ?? `{{${key}}}`);
}

function findUnfilledMergeTags(value: string): string[] {
  return Array.from(new Set(Array.from(value.matchAll(/\{\{([A-Z0-9_]+)\}\}/g), (match) => match[1]))).sort();
}

function getObjectProperty(object: ts.ObjectLiteralExpression, key: string): ts.Expression | undefined {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = property.name;
    if (ts.isIdentifier(name) && name.text === key) return property.initializer;
    if (ts.isStringLiteral(name) && name.text === key) return property.initializer;
  }
  return undefined;
}

function readStringProperty(object: ts.ObjectLiteralExpression, key: string, required = true): string | undefined {
  const value = getObjectProperty(object, key);
  if (!value) {
    if (required) throw new Error(`Missing ${key} in DEFAULT_TEMPLATES entry`);
    return undefined;
  }
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
    return value.text;
  }
  throw new Error(`Expected ${key} to be a string literal in DEFAULT_TEMPLATES entry`);
}

function readBooleanProperty(object: ts.ObjectLiteralExpression, key: string): boolean {
  const value = getObjectProperty(object, key);
  if (!value) throw new Error(`Missing ${key} in DEFAULT_TEMPLATES entry`);
  if (value.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (value.kind === ts.SyntaxKind.FalseKeyword) return false;
  throw new Error(`Expected ${key} to be a boolean literal in DEFAULT_TEMPLATES entry`);
}

function parseSeedTemplates(source: string): SeedTemplate[] {
  const sourceFile = ts.createSourceFile("seed-email-templates.ts", source, ts.ScriptTarget.Latest, true);
  let initializer: ts.ArrayLiteralExpression | undefined;

  sourceFile.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "DEFAULT_TEMPLATES" &&
        declaration.initializer &&
        ts.isArrayLiteralExpression(declaration.initializer)
      ) {
        initializer = declaration.initializer;
      }
    }
  });

  if (!initializer) throw new Error("Could not find DEFAULT_TEMPLATES array in scripts/seed-email-templates.ts");

  return initializer.elements.map((element) => {
    if (!ts.isObjectLiteralExpression(element)) {
      throw new Error("Expected DEFAULT_TEMPLATES entries to be object literals");
    }
    return {
      key: readStringProperty(element, "key")!,
      name: readStringProperty(element, "name")!,
      subject: readStringProperty(element, "subject")!,
      bodyHtml: readStringProperty(element, "bodyHtml", false),
      bodyText: readStringProperty(element, "bodyText", false),
      isEnabled: readBooleanProperty(element, "isEnabled"),
    };
  });
}

async function loadSeedPreviews(): Promise<PreviewArtifact[]> {
  const seedPath = path.resolve(process.cwd(), "scripts/seed-email-templates.ts");
  const templates = parseSeedTemplates(await fs.readFile(seedPath, "utf8"));

  return templates.map((template) => {
    const subject = replaceMergeTags(template.subject);
    const html = template.bodyHtml
      ? replaceMergeTags(template.bodyHtml)
      : wrapTextHtml(replaceMergeTags(template.bodyText || ""));
    return {
      slug: slugify(template.key),
      key: template.key,
      title: template.name,
      source: "scripts/seed-email-templates.ts",
      subject,
      html,
      text: template.bodyText ? replaceMergeTags(template.bodyText) : undefined,
    };
  });
}

async function scanEmailSenders(): Promise<Array<{ file: string; line: number; text: string }>> {
  const results: Array<{ file: string; line: number; text: string }> = [];

  for (const relativePath of sourceScanPaths) {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    try {
      const lines = (await fs.readFile(absolutePath, "utf8")).split(/\r?\n/);
      lines.forEach((line, index) => {
        if (
          line.includes("emailService.sendEmail") ||
          line.includes("sendTestEmail(") ||
          line.includes("messages.create") ||
          line.includes("mailgun.client") ||
          line.includes("MAILGUN_DOMAIN")
        ) {
          results.push({ file: relativePath, line: index + 1, text: line.trim() });
        }
      });
    } catch {
      results.push({ file: relativePath, line: 0, text: "Could not read source file" });
    }
  }

  return results;
}

function collectLinks(html: string): string[] {
  return Array.from(
    new Set(
      Array.from(html.matchAll(/\bhref=["']([^"']+)["']/gi), (match) => match[1])
        .filter((url) => !url.startsWith("mailto:") && !url.startsWith("tel:")),
    ),
  );
}

function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url, baseUrl);
    return parsed.host === new URL(baseUrl).host;
  } catch {
    return false;
  }
}

async function auditLink(preview: string, url: string): Promise<LinkAuditResult> {
  const resolved = new URL(url, baseUrl).toString();
  try {
    let response = await fetch(resolved, { method: "HEAD", redirect: "manual" });
    if (response.status === 405) {
      response = await fetch(resolved, { method: "GET", redirect: "manual" });
    }
    return {
      preview,
      url: resolved,
      status: response.status,
      ok: response.status < 400,
      note: response.status >= 300 && response.status < 400 ? "redirect" : undefined,
    };
  } catch (error: unknown) {
    return {
      preview,
      url: resolved,
      status: null,
      ok: false,
      note: error instanceof Error ? error.message : String(error),
    };
  }
}

async function auditInternalLinks(previews: PreviewArtifact[]): Promise<LinkAuditResult[]> {
  const checks: Promise<LinkAuditResult>[] = [];
  for (const preview of previews) {
    for (const link of collectLinks(preview.html).filter(isInternalUrl)) {
      checks.push(auditLink(preview.slug, link));
    }
  }
  return Promise.all(checks);
}

async function sendPreviews(previews: PreviewArtifact[]): Promise<SendResult[]> {
  if (!sendTo) return [];

  await import("../server/src/config/load-env");
  const { emailService } = await import("../server/src/integrations/mailgun/EmailService");

  const results: SendResult[] = [];
  for (const preview of previews) {
    const result = await emailService.sendEmail({
      to: sendTo,
      subject: `[Preview Audit] ${preview.subject}`,
      html: preview.html,
      text: preview.text,
    });
    results.push({
      preview: preview.slug,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  }
  return results;
}

async function writeArtifacts(
  previews: PreviewArtifact[],
  linkAudit: LinkAuditResult[],
  sourceScan: Array<{ file: string; line: number; text: string }>,
  sendResults: SendResult[],
): Promise<void> {
  if (skipArtifacts) return;

  await fs.mkdir(outputDir, { recursive: true });
  for (const preview of previews) {
    const fileName = `${preview.slug}.html`;
    preview.htmlPath = path.join(outputDir, fileName);
    await fs.writeFile(preview.htmlPath, preview.html);
  }

  const manifest = previews.map((preview) => ({
    key: preview.key,
    title: preview.title,
    subject: preview.subject,
    source: preview.source,
    htmlPath: preview.htmlPath,
    unfilledMergeTags: findUnfilledMergeTags(`${preview.subject}\n${preview.html}\n${preview.text || ""}`),
  }));

  await fs.writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(outputDir, "link-audit.json"), JSON.stringify(linkAudit, null, 2));
  await fs.writeFile(path.join(outputDir, "source-scan.json"), JSON.stringify(sourceScan, null, 2));
  await fs.writeFile(path.join(outputDir, "send-results.json"), JSON.stringify(sendResults, null, 2));
  await fs.writeFile(
    path.join(outputDir, "index.html"),
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Power Plunge Email Preview Audit</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 32px; background: #f8fafc; color: #0f172a; }
    main { max-width: 980px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
    th { background: #e0f2fe; font-size: 12px; text-transform: uppercase; color: #075985; }
    a { color: #0891b2; }
    code { background: #e2e8f0; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
<main>
  <h1>Power Plunge Email Preview Audit</h1>
  <p>${runDate} · ${previews.length} previews · ${linkAudit.filter((item) => !item.ok).length} link failures · ${sendResults.length ? `${sendResults.filter((item) => item.success).length}/${sendResults.length} sends ok` : "no real sends"}</p>
  <table>
    <thead><tr><th>Template</th><th>Subject</th><th>Preview</th><th>Open Tags</th></tr></thead>
    <tbody>
      ${manifest.map((item) => `<tr><td>${escapeHtml(item.key)}</td><td>${escapeHtml(item.subject)}</td><td><a href="${path.basename(item.htmlPath || "")}">Open</a></td><td>${item.unfilledMergeTags.map((tag) => `<code>${escapeHtml(tag)}</code>`).join(" ") || "None"}</td></tr>`).join("")}
    </tbody>
  </table>
</main>
</body>
</html>`,
  );
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    printUsage();
    return;
  }

  const previews = await loadSeedPreviews();
  const sourceScan = await scanEmailSenders();
  const linkAudit = shouldAuditLinks ? await auditInternalLinks(previews) : [];
  const sendResults = await sendPreviews(previews);

  await writeArtifacts(previews, linkAudit, sourceScan, sendResults);

  const summary = {
    runDate,
    outputDir: skipArtifacts ? null : outputDir,
    previewCount: previews.length,
    sourceSendCallSites: sourceScan.length,
    linkChecks: linkAudit.length,
    linkFailures: linkAudit.filter((result) => !result.ok).length,
    unfilledMergeTagPreviews: previews
      .map((preview) => ({
        key: preview.key,
        tags: findUnfilledMergeTags(`${preview.subject}\n${preview.html}\n${preview.text || ""}`),
      }))
      .filter((item) => item.tags.length > 0),
    sentPreviewEmails: sendResults.length,
    sendFailures: sendResults.filter((result) => !result.success).length,
    linkAuditSkipped: !shouldAuditLinks,
    linkAuditSkipReason: shouldAuditLinks
      ? null
      : skipLinkAudit
        ? "EMAIL_PREVIEW_SKIP_LINK_AUDIT=1"
        : "PUBLIC_SITE_URL not set",
    excludedRuntimeCapture:
      "Runtime sender execution is intentionally excluded; this first pass statically renders seeded templates and source-scans inline senders.",
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.linkFailures || summary.unfilledMergeTagPreviews.length || summary.sendFailures ? 1 : 0);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
