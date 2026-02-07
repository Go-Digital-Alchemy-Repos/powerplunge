#!/usr/bin/env npx tsx
/**
 * API Smoke Tests
 *
 * Hits key HTTP endpoints and reports PASS / FAIL.
 * Requires the app to be running on localhost:5000.
 *
 * Run:  npx tsx scripts/smoke/apiSmoke.ts
 *
 * Admin endpoints return 401 without auth (expected).
 * Public endpoints should return 200.
 */

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:5000";

interface Check {
  name: string;
  url: string;
  method?: string;
  body?: any;
  expectStatus: number | number[];
  expectJson?: (body: any) => boolean;
  note?: string;
}

const checks: Check[] = [
  // ── CMS v2 Health ──
  {
    name: "CMS v2 health",
    url: "/api/admin/cms-v2/health",
    expectStatus: [200, 401],
    note: "200 with auth, 401 without",
  },

  // ── Admin CMS v2 endpoints (expect 401 without auth) ──
  {
    name: "Admin CMS v2 pages (no auth)",
    url: "/api/admin/cms-v2/pages",
    expectStatus: 401,
    note: "Auth required",
  },
  {
    name: "Admin CMS v2 sections (no auth)",
    url: "/api/admin/cms-v2/sections",
    expectStatus: 401,
    note: "Auth required",
  },
  {
    name: "Admin CMS v2 templates (no auth)",
    url: "/api/admin/cms-v2/templates",
    expectStatus: 401,
    note: "Auth required",
  },
  {
    name: "Admin CMS v2 themes (no auth)",
    url: "/api/admin/cms-v2/themes",
    expectStatus: 401,
    note: "Auth required",
  },
  {
    name: "Admin CMS v2 posts (no auth)",
    url: "/api/admin/cms-v2/posts",
    expectStatus: 401,
    note: "Auth required",
  },
  {
    name: "Admin CMS v2 menus (no auth)",
    url: "/api/admin/cms-v2/menus",
    expectStatus: 401,
    note: "Auth required",
  },
  {
    name: "Admin CMS v2 site-settings (no auth)",
    url: "/api/admin/cms-v2/site-settings",
    expectStatus: 401,
    note: "Auth required",
  },
  {
    name: "Admin CMS v2 site-presets (no auth)",
    url: "/api/admin/cms-v2/site-presets",
    expectStatus: 401,
    note: "Auth required",
  },

  // ── Public endpoints ──
  {
    name: "Public products",
    url: "/api/products",
    expectStatus: 200,
    expectJson: (b) => Array.isArray(b),
  },
  {
    name: "Public home page",
    url: "/api/pages/home",
    expectStatus: [200, 404],
    note: "200 if home page exists, 404 otherwise",
  },
  {
    name: "Public shop page",
    url: "/api/pages/shop",
    expectStatus: [200, 404],
    note: "200 if shop page exists, 404 otherwise",
  },
  {
    name: "Public site settings",
    url: "/api/site-settings",
    expectStatus: 200,
  },
  {
    name: "Public blog posts",
    url: "/api/blog/posts",
    expectStatus: 200,
    expectJson: (b) => Array.isArray(b) || (b && Array.isArray(b.data)),
    note: "Returns array or { data: [], total, page, pageSize }",
  },
  {
    name: "Public blog tags",
    url: "/api/blog/tags",
    expectStatus: 200,
    expectJson: (b) => Array.isArray(b),
  },
  {
    name: "Public blog categories",
    url: "/api/blog/categories",
    expectStatus: 200,
    expectJson: (b) => Array.isArray(b),
  },
  {
    name: "Public blog post by slug (nonexistent)",
    url: "/api/blog/posts/nonexistent-slug-smoke-test",
    expectStatus: 404,
  },
  {
    name: "Public menu (main)",
    url: "/api/menus/main",
    expectStatus: 200,
    note: "Returns null if no menu configured",
  },
  {
    name: "Public menu (footer)",
    url: "/api/menus/footer",
    expectStatus: 200,
    note: "Returns null if no menu configured",
  },

  // ── Auth enforcement ──
  {
    name: "Admin orders auth enforced",
    url: "/api/admin/orders",
    expectStatus: 401,
  },
  {
    name: "Customer profile auth enforced",
    url: "/api/customer/profile",
    expectStatus: 401,
  },

  // ── Stripe config ──
  {
    name: "Stripe config",
    url: "/api/stripe/config",
    expectStatus: [200, 404, 500],
    note: "200 if Stripe configured, may 500 if key missing",
  },
];

let passCount = 0;
let failCount = 0;
let warnCount = 0;

async function runCheck(check: Check) {
  const { name, url, method = "GET", body, expectStatus, expectJson, note } = check;
  const fullUrl = `${BASE}${url}`;

  try {
    const opts: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(fullUrl, opts);
    const statusArr = Array.isArray(expectStatus) ? expectStatus : [expectStatus];

    if (!statusArr.includes(res.status)) {
      failCount++;
      console.log(`  FAIL  ${name}  — expected ${statusArr.join("|")}, got ${res.status}`);
      return;
    }

    if (expectJson) {
      try {
        const json = await res.json();
        if (!expectJson(json)) {
          failCount++;
          console.log(`  FAIL  ${name}  — JSON shape assertion failed`);
          return;
        }
      } catch {
        failCount++;
        console.log(`  FAIL  ${name}  — response is not valid JSON`);
        return;
      }
    }

    passCount++;
    console.log(`  PASS  ${name}${note ? `  (${note})` : ""}`);
  } catch (err: any) {
    failCount++;
    console.log(`  FAIL  ${name}  — ${err.message}`);
  }
}

async function main() {
  console.log(`=== API Smoke Tests ===`);
  console.log(`Base URL: ${BASE}\n`);

  console.log("── CMS v2 & Health ──");
  for (const c of checks.filter((c) => c.url.includes("cms-v2") || c.url.includes("health"))) {
    await runCheck(c);
  }

  console.log("\n── Public Endpoints ──");
  for (const c of checks.filter((c) => !c.url.includes("admin") && !c.url.includes("customer") && !c.url.includes("stripe"))) {
    await runCheck(c);
  }

  console.log("\n── Auth Enforcement ──");
  for (const c of checks.filter((c) => c.url.includes("admin/orders") || c.url.includes("customer/"))) {
    await runCheck(c);
  }

  console.log("\n── Stripe ──");
  for (const c of checks.filter((c) => c.url.includes("stripe"))) {
    await runCheck(c);
  }

  console.log(`\n=== Results: ${passCount} passed, ${failCount} failed, ${warnCount} warnings ===`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("API smoke test error:", err);
  process.exit(1);
});
