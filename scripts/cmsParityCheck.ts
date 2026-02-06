import { db } from "../server/db";
import { pages } from "../shared/schema";
import { eq } from "drizzle-orm";
import { cmsV2Repository } from "../server/src/repositories/cms-v2.repository";

const PAGE_FIELDS = [
  "id", "title", "slug", "content", "contentJson", "pageType",
  "isHome", "isShop", "template", "metaTitle", "metaDescription",
  "metaKeywords", "canonicalUrl", "ogTitle", "ogDescription", "ogImage",
  "twitterCard", "twitterTitle", "twitterDescription", "twitterImage",
  "robots", "featuredImage", "status", "showInNav", "navOrder",
  "createdAt", "updatedAt",
] as const;

type CheckResult = { name: string; pass: boolean; detail: string };

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == b;
  if (typeof a !== typeof b) return false;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a !== "object") return false;
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
  for (const key of keys) {
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

function diffFields(legacy: Record<string, unknown>, v2: Record<string, unknown>): string[] {
  const diffs: string[] = [];
  for (const field of PAGE_FIELDS) {
    if (!deepEqual(legacy[field], v2[field])) {
      diffs.push(`${field}: legacy=${JSON.stringify(legacy[field])} vs v2=${JSON.stringify(v2[field])}`);
    }
  }
  return diffs;
}

async function checkListPages(): Promise<CheckResult> {
  const legacy = await db.select().from(pages).orderBy(pages.navOrder);
  const v2 = await cmsV2Repository.findAll();

  if (legacy.length !== v2.length) {
    return { name: "GET /pages (list)", pass: false, detail: `Count mismatch: legacy=${legacy.length} v2=${v2.length}` };
  }

  const mismatches: string[] = [];
  for (let i = 0; i < legacy.length; i++) {
    const diffs = diffFields(legacy[i] as Record<string, unknown>, v2[i] as Record<string, unknown>);
    if (diffs.length > 0) {
      mismatches.push(`Page[${i}] (${legacy[i].slug}): ${diffs.join(", ")}`);
    }
  }

  if (mismatches.length > 0) {
    return { name: "GET /pages (list)", pass: false, detail: mismatches.join("\n    ") };
  }
  return { name: "GET /pages (list)", pass: true, detail: `${legacy.length} pages match` };
}

async function checkHomePage(): Promise<CheckResult> {
  const [legacy] = await db.select().from(pages).where(eq(pages.isHome, true));
  const v2 = await cmsV2Repository.findHome();

  if (!legacy && !v2) {
    return { name: "GET /pages/home", pass: true, detail: "Both return no home page" };
  }
  if (!legacy || !v2) {
    return { name: "GET /pages/home", pass: false, detail: `legacy=${legacy ? "found" : "missing"} v2=${v2 ? "found" : "missing"}` };
  }

  const diffs = diffFields(legacy as Record<string, unknown>, v2 as Record<string, unknown>);
  if (diffs.length > 0) {
    return { name: "GET /pages/home", pass: false, detail: diffs.join(", ") };
  }
  return { name: "GET /pages/home", pass: true, detail: `id=${legacy.id} title="${legacy.title}"` };
}

async function checkShopPage(): Promise<CheckResult> {
  const [legacy] = await db.select().from(pages).where(eq(pages.isShop, true));
  const v2 = await cmsV2Repository.findShop();

  if (!legacy && !v2) {
    return { name: "GET /pages/shop", pass: true, detail: "Both return no shop page" };
  }
  if (!legacy || !v2) {
    return { name: "GET /pages/shop", pass: false, detail: `legacy=${legacy ? "found" : "missing"} v2=${v2 ? "found" : "missing"}` };
  }

  const diffs = diffFields(legacy as Record<string, unknown>, v2 as Record<string, unknown>);
  if (diffs.length > 0) {
    return { name: "GET /pages/shop", pass: false, detail: diffs.join(", ") };
  }
  return { name: "GET /pages/shop", pass: true, detail: `id=${legacy.id} title="${legacy.title}"` };
}

async function checkPageById(): Promise<CheckResult> {
  const allPages = await db.select().from(pages).orderBy(pages.navOrder);
  if (allPages.length === 0) {
    return { name: "GET /pages/:id", pass: true, detail: "No pages to check" };
  }

  const mismatches: string[] = [];
  for (const legacyPage of allPages) {
    const v2 = await cmsV2Repository.findById(legacyPage.id);
    if (!v2) {
      mismatches.push(`Page ${legacyPage.id} (${legacyPage.slug}): missing in v2`);
      continue;
    }
    const diffs = diffFields(legacyPage as Record<string, unknown>, v2 as Record<string, unknown>);
    if (diffs.length > 0) {
      mismatches.push(`Page ${legacyPage.id} (${legacyPage.slug}): ${diffs.join(", ")}`);
    }
  }

  if (mismatches.length > 0) {
    return { name: "GET /pages/:id", pass: false, detail: mismatches.join("\n    ") };
  }
  return { name: "GET /pages/:id", pass: true, detail: `${allPages.length} pages checked individually` };
}

async function main() {
  console.log("=== CMS Parity Check: Legacy vs CMS v2 ===\n");

  const checks = [
    await checkListPages(),
    await checkHomePage(),
    await checkShopPage(),
    await checkPageById(),
  ];

  let allPass = true;
  for (const result of checks) {
    const icon = result.pass ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${result.name}`);
    console.log(`    ${result.detail}\n`);
    if (!result.pass) allPass = false;
  }

  console.log(`\nResult: ${allPass ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error("Parity check error:", err);
  process.exit(1);
});
