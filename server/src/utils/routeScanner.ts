import fs from "fs";
import path from "path";

export interface RouteEntry {
  method: string;
  path: string;
  file: string;
  domain: string;
  line: number;
}

export interface DomainRoutes {
  domain: string;
  displayName: string;
  files: string[];
  routes: RouteEntry[];
}

const ROUTES_DIRS = [
  "server/src/routes",
  "server/src/routes/admin",
  "server/src/routes/customer",
  "server/src/routes/public",
];

const DOMAIN_MAP: Record<string, { domain: string; displayName: string }> = {
  "routes.ts": { domain: "main", displayName: "Main Application Routes" },
  "affiliate.routes.ts": { domain: "affiliates", displayName: "Affiliate Management" },
  "alerts.routes.ts": { domain: "alerts", displayName: "Revenue Alerts" },
  "coupon.routes.ts": { domain: "coupons", displayName: "Coupon System" },
  "recovery.routes.ts": { domain: "recovery", displayName: "Checkout Recovery" },
  "revenue.routes.ts": { domain: "revenue", displayName: "Revenue Analytics" },
  "support.routes.ts": { domain: "support", displayName: "Customer Support" },
  "upsell.routes.ts": { domain: "upsells", displayName: "Upsell / Cross-sell" },
  "vip.routes.ts": { domain: "vip", displayName: "VIP Program" },
  "customers.routes.ts": { domain: "admin-customers", displayName: "Admin Customers" },
  "products.routes.ts": { domain: "admin-products", displayName: "Admin Products" },
  "media.routes.ts": { domain: "admin-media", displayName: "Admin Media" },
  "affiliate-portal.routes.ts": { domain: "affiliate-portal", displayName: "Affiliate Portal" },
  "auth.routes.ts": { domain: "customer-auth", displayName: "Customer Authentication" },
  "order-tracking.routes.ts": { domain: "order-tracking", displayName: "Order Tracking" },
  "affiliate-signup.routes.ts": { domain: "affiliate-signup", displayName: "Affiliate Signup" },
  "affiliate-tracking.routes.ts": { domain: "affiliate-tracking", displayName: "Affiliate Tracking" },
  "order-status.routes.ts": { domain: "order-status", displayName: "Public Order Status" },
};

const BASE_PATH_MAP: Record<string, string> = {
  "routes.ts": "",
  "affiliate.routes.ts": "/api/admin",
  "alerts.routes.ts": "/api/admin",
  "coupon.routes.ts": "/api/admin",
  "recovery.routes.ts": "/api/admin",
  "revenue.routes.ts": "/api/admin",
  "support.routes.ts": "/api/admin",
  "upsell.routes.ts": "/api/admin",
  "vip.routes.ts": "/api/admin",
  "customers.routes.ts": "/api/admin/customers",
  "products.routes.ts": "/api/admin/products",
  "media.routes.ts": "/api/admin/media",
  "affiliate-portal.routes.ts": "/api/customer",
  "auth.routes.ts": "/api/customer",
  "order-tracking.routes.ts": "/api/customer",
  "affiliate-signup.routes.ts": "/api",
  "affiliate-tracking.routes.ts": "/api",
  "order-status.routes.ts": "/api",
};

const STANDARD_ROUTE_REGEX = /(?:router|app)\.(get|post|patch|put|delete)\s*\([^)]{0,200}?["'`]([^"'`]+)["'`]/gi;
const CHAINED_ROUTE_REGEX = /(?:router|app)\.route\s*\(\s*["'`]([^"'`]+)["'`]\s*\)[^)]{0,100}?\.(get|post|patch|put|delete)\s*\(/gi;

function scanFile(filePath: string): RouteEntry[] {
  const entries: RouteEntry[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const basename = path.basename(filePath);
  const domainInfo = DOMAIN_MAP[basename] || {
    domain: basename.replace(/\.routes?\.ts$/, ""),
    displayName: basename.replace(/\.routes?\.ts$/, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
  };
  const basePath = BASE_PATH_MAP[basename] || "";

  let match: RegExpExecArray | null;

  const stdRegex = new RegExp(STANDARD_ROUTE_REGEX.source, "gi");
  while ((match = stdRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    const lineNum = content.substring(0, match.index).split("\n").length;

    if (routePath.startsWith("/api/") || basename === "routes.ts") {
      entries.push({ method, path: routePath, file: filePath, domain: domainInfo.domain, line: lineNum });
    } else {
      entries.push({ method, path: basePath + routePath, file: filePath, domain: domainInfo.domain, line: lineNum });
    }
  }

  const chainedRegex = new RegExp(CHAINED_ROUTE_REGEX.source, "gi");
  while ((match = chainedRegex.exec(content)) !== null) {
    const routePath = match[1];
    const method = match[2].toUpperCase();
    const lineNum = content.substring(0, match.index).split("\n").length;

    if (routePath.startsWith("/api/") || basename === "routes.ts") {
      entries.push({ method, path: routePath, file: filePath, domain: domainInfo.domain, line: lineNum });
    } else {
      entries.push({ method, path: basePath + routePath, file: filePath, domain: domainInfo.domain, line: lineNum });
    }
  }

  return entries;
}

export function scanAllRoutes(): Map<string, DomainRoutes> {
  const domainMap = new Map<string, DomainRoutes>();
  const cwd = process.cwd();

  const mainRoutesPath = path.join(cwd, "server/routes.ts");
  if (fs.existsSync(mainRoutesPath)) {
    const entries = scanFile(mainRoutesPath);
    const basename = "routes.ts";
    const info = DOMAIN_MAP[basename];
    if (!domainMap.has(info.domain)) {
      domainMap.set(info.domain, { domain: info.domain, displayName: info.displayName, files: [], routes: [] });
    }
    const dr = domainMap.get(info.domain)!;
    dr.files.push(mainRoutesPath);
    dr.routes.push(...entries);
  }

  for (const dir of ROUTES_DIRS) {
    const fullDir = path.join(cwd, dir);
    if (!fs.existsSync(fullDir)) continue;

    const files = fs.readdirSync(fullDir).filter(f => f.endsWith(".ts") && f !== "index.ts");
    for (const file of files) {
      const filePath = path.join(fullDir, file);
      const entries = scanFile(filePath);
      if (entries.length === 0) continue;

      const basename = path.basename(file);
      const domainInfo = DOMAIN_MAP[basename] || {
        domain: basename.replace(/\.routes?\.ts$/, ""),
        displayName: basename.replace(/\.routes?\.ts$/, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      };

      if (!domainMap.has(domainInfo.domain)) {
        domainMap.set(domainInfo.domain, { domain: domainInfo.domain, displayName: domainInfo.displayName, files: [], routes: [] });
      }
      const dr = domainMap.get(domainInfo.domain)!;
      if (!dr.files.includes(filePath)) dr.files.push(filePath);
      dr.routes.push(...entries);
    }
  }

  return domainMap;
}

export function generateAutoSection(domainRoutes: DomainRoutes): string {
  const lines: string[] = [];
  lines.push("## Endpoints\n");
  lines.push("| Method | Path | Source File | Line |");
  lines.push("|--------|------|-------------|------|");

  const sortedRoutes = [...domainRoutes.routes].sort((a, b) => {
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    const methodOrder = ["GET", "POST", "PATCH", "PUT", "DELETE"];
    return methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method);
  });

  for (const r of sortedRoutes) {
    const relFile = path.relative(process.cwd(), r.file);
    lines.push(`| \`${r.method}\` | \`${r.path}\` | ${relFile} | ${r.line} |`);
  }

  lines.push(`\n_${sortedRoutes.length} endpoint(s) detected._`);
  return lines.join("\n");
}

const AUTO_START = "<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->";
const AUTO_END = "<!-- === END AUTO-GENERATED SECTION === -->";

export function mergeContent(existingContent: string, autoSection: string): string {
  const startIdx = existingContent.indexOf(AUTO_START);
  const endIdx = existingContent.indexOf(AUTO_END);

  if (startIdx !== -1 && endIdx !== -1) {
    return existingContent.substring(0, startIdx) + AUTO_START + "\n\n" + autoSection + "\n\n" + AUTO_END + existingContent.substring(endIdx + AUTO_END.length);
  }

  return existingContent.trimEnd() + "\n\n" + AUTO_START + "\n\n" + autoSection + "\n\n" + AUTO_END + "\n";
}

export function createStubDocument(domainRoutes: DomainRoutes): string {
  const lines: string[] = [];
  lines.push(`# ${domainRoutes.displayName}\n`);
  lines.push("## Module Info\n");
  lines.push("| Property | Value |");
  lines.push("|----------|-------|");
  lines.push(`| Domain | ${domainRoutes.domain} |`);
  lines.push(`| Source Files | ${domainRoutes.files.map(f => path.relative(process.cwd(), f)).join(", ")} |`);
  lines.push(`| Endpoint Count | ${domainRoutes.routes.length} |`);
  lines.push("");
  lines.push("## Auth & Authorization\n");
  lines.push("| Property | Value |");
  lines.push("|----------|-------|");
  lines.push("| Auth Required | TBD |");
  lines.push("| Roles Allowed | TBD |");
  lines.push("");
  lines.push("## Notes\n");
  lines.push("_Add manual documentation notes here. This section is preserved during sync._\n");
  lines.push("");
  lines.push(AUTO_START);
  lines.push("");
  lines.push(generateAutoSection(domainRoutes));
  lines.push("");
  lines.push(AUTO_END);
  lines.push("");
  return lines.join("\n");
}
