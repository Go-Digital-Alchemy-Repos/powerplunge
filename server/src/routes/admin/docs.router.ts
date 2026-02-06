import { Router } from "express";
import fs from "fs";
import path from "path";
import { scanAllRoutes, generateAutoSection, mergeContent, createStubDocument } from "../../utils/routeScanner";

const router = Router();

const DOCS_DIR = path.join(process.cwd(), "docs");

interface CategoryConfig {
  displayName: string;
  icon: string;
  order: number;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  "01-GETTING-STARTED": { displayName: "Getting Started", icon: "Rocket", order: 1 },
  "02-ARCHITECTURE": { displayName: "Architecture", icon: "Layers", order: 2 },
  "03-FEATURES": { displayName: "Features", icon: "Sparkles", order: 3 },
  "04-API": { displayName: "API Reference", icon: "Code", order: 4 },
  "05-FRONTEND": { displayName: "Frontend", icon: "Monitor", order: 5 },
  "06-BACKEND": { displayName: "Backend", icon: "Server", order: 6 },
  "07-SECURITY": { displayName: "Security", icon: "Shield", order: 7 },
  "08-DATABASE": { displayName: "Database", icon: "Database", order: 8 },
  "09-TESTING": { displayName: "Testing", icon: "TestTube", order: 9 },
  "10-DEPLOYMENT": { displayName: "Deployment", icon: "Cloud", order: 10 },
  "11-DEVELOPMENT": { displayName: "Development", icon: "Terminal", order: 11 },
  "12-OPERATIONS": { displayName: "Operations", icon: "Settings", order: 12 },
  "13-INTEGRATIONS": { displayName: "Integrations", icon: "Plug", order: 13 },
  "14-TROUBLESHOOTING": { displayName: "Troubleshooting", icon: "AlertTriangle", order: 14 },
  "15-REFERENCE": { displayName: "Reference", icon: "BookOpen", order: 15 },
  "16-CHANGELOG": { displayName: "Changelog", icon: "History", order: 16 },
  "17-API-REGISTRY": { displayName: "API Registry", icon: "FileJson", order: 17 },
  "18-FUNCTIONAL-DOCS": { displayName: "Functional Docs", icon: "ClipboardList", order: 18 },
  "19-CMS-V2": { displayName: "CMS v2", icon: "LayoutDashboard", order: 19 },
};

interface DocMeta {
  id: string;
  filename: string;
  title: string;
  category: string;
  relativePath: string;
  sizeBytes: number;
  modifiedAt: string;
}

interface CategoryGroup {
  id: string;
  displayName: string;
  icon: string;
  order: number;
  docs: DocMeta[];
}

function extractTitle(content: string, filename: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  return filename.replace(/\.md$/, "").replace(/[-_]/g, " ");
}

function pathToId(relativePath: string): string {
  return relativePath.replace(/\.md$/, "").replace(/\//g, "__");
}

function idToPath(id: string): string {
  return id.replace(/__/g, "/") + ".md";
}

function scanDocsDir(): CategoryGroup[] {
  const categoryMap = new Map<string, CategoryGroup>();

  if (!fs.existsSync(DOCS_DIR)) return [];

  const entries = fs.readdirSync(DOCS_DIR, { withFileTypes: true });

  const rootMdFiles = entries.filter(e => e.isFile() && e.name.endsWith(".md"));
  if (rootMdFiles.length > 0) {
    categoryMap.set("_root", {
      id: "_root",
      displayName: "General",
      icon: "FileText",
      order: 0,
      docs: [],
    });

    for (const file of rootMdFiles) {
      const filePath = path.join(DOCS_DIR, file.name);
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, "utf-8");
      const relativePath = file.name;

      categoryMap.get("_root")!.docs.push({
        id: pathToId(relativePath),
        filename: file.name,
        title: extractTitle(content, file.name),
        category: "_root",
        relativePath,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      });
    }
  }

  const dirs = entries.filter(e => e.isDirectory());
  for (const dir of dirs) {
    const dirPath = path.join(DOCS_DIR, dir.name);
    const config = CATEGORY_CONFIG[dir.name] || {
      displayName: dir.name.replace(/^\d+-/, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      icon: "Folder",
      order: 50 + dirs.indexOf(dir),
    };

    const mdFiles = scanDirRecursive(dirPath, dir.name);
    if (mdFiles.length === 0) continue;

    categoryMap.set(dir.name, {
      id: dir.name,
      displayName: config.displayName,
      icon: config.icon,
      order: config.order,
      docs: mdFiles,
    });
  }

  const categories = Array.from(categoryMap.values());
  categories.sort((a, b) => a.order - b.order);
  for (const cat of categories) {
    cat.docs.sort((a, b) => a.title.localeCompare(b.title));
  }

  return categories;
}

function scanDirRecursive(dirPath: string, categoryId: string): DocMeta[] {
  const docs: DocMeta[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile() && entry.name.endsWith(".md")) {
      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, "utf-8");
      const relativePath = path.relative(DOCS_DIR, fullPath);

      docs.push({
        id: pathToId(relativePath),
        filename: entry.name,
        title: extractTitle(content, entry.name),
        category: categoryId,
        relativePath,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      });
    } else if (entry.isDirectory()) {
      docs.push(...scanDirRecursive(fullPath, categoryId));
    }
  }

  return docs;
}

router.get("/", (req, res) => {
  try {
    const categories = scanDocsDir();
    res.json({ categories });
  } catch (error) {
    console.error("[DOCS] Error listing docs:", error);
    res.status(500).json({ message: "Failed to list documentation" });
  }
});

router.get("/coverage", (req, res) => {
  try {
    const allDomains = scanAllRoutes();
    const registryDir = path.join(DOCS_DIR, "17-API-REGISTRY");
    const functionalDir = path.join(DOCS_DIR, "18-FUNCTIONAL-DOCS");

    const apiDomains: Array<{
      domain: string;
      displayName: string;
      endpointCount: number;
      hasDoc: boolean;
      hasAuthNotes: boolean;
      hasExamples: boolean;
    }> = [];

    allDomains.forEach((dr) => {
      const docPath = path.join(registryDir, `${dr.domain}.md`);
      let hasDoc = false;
      let hasAuthNotes = false;
      let hasExamples = false;

      if (fs.existsSync(docPath)) {
        hasDoc = true;
        const content = fs.readFileSync(docPath, "utf-8");
        const authMatch = content.match(/Auth Required\s*\|\s*(.+)/);
        hasAuthNotes = !!authMatch && !authMatch[1].includes("TBD");
        hasExamples = /```(json|typescript|ts|javascript|js)/i.test(content);
      }

      apiDomains.push({
        domain: dr.domain,
        displayName: dr.displayName,
        endpointCount: dr.routes.length,
        hasDoc,
        hasAuthNotes,
        hasExamples,
      });
    });

    const requiredFunctionalDocs = [
      { id: "AFFILIATE_SYSTEM", name: "Affiliate System" },
      { id: "CHECKOUT_FLOW", name: "Checkout Flow" },
      { id: "ORDER_MANAGEMENT", name: "Order Management" },
      { id: "CUSTOMER_AUTH", name: "Customer Authentication" },
      { id: "ADMIN_RBAC", name: "Admin Role-Based Access" },
      { id: "PAYMENT_PROCESSING", name: "Payment Processing (Stripe)" },
      { id: "EMAIL_NOTIFICATIONS", name: "Email Notifications" },
      { id: "UPSELL_SYSTEM", name: "Upsell / Cross-sell System" },
      { id: "VIP_PROGRAM", name: "VIP Program" },
      { id: "COUPON_SYSTEM", name: "Coupon System" },
    ];

    const functionalDocs: Array<{
      id: string;
      name: string;
      exists: boolean;
      isEmpty: boolean;
      wordCount: number;
    }> = [];

    for (const reqDoc of requiredFunctionalDocs) {
      const docPath = path.join(functionalDir, `${reqDoc.id}.md`);
      let exists = false;
      let isEmpty = true;
      let wordCount = 0;

      if (fs.existsSync(docPath)) {
        exists = true;
        const content = fs.readFileSync(docPath, "utf-8");
        wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
        isEmpty = wordCount < 100;
      }

      functionalDocs.push({ id: reqDoc.id, name: reqDoc.name, exists, isEmpty, wordCount });
    }

    const apiTotal = apiDomains.length;
    const apiDocumented = apiDomains.filter(d => d.hasDoc).length;
    const apiCoveragePct = apiTotal > 0 ? Math.round((apiDocumented / apiTotal) * 100) : 0;

    const funcTotal = functionalDocs.length;
    const funcComplete = functionalDocs.filter(d => d.exists && !d.isEmpty).length;
    const funcCoveragePct = funcTotal > 0 ? Math.round((funcComplete / funcTotal) * 100) : 0;

    res.json({
      apiCoveragePct,
      funcCoveragePct,
      apiDomains,
      functionalDocs,
      summary: {
        apiTotal,
        apiDocumented,
        funcTotal,
        funcComplete,
      },
    });
  } catch (error) {
    console.error("[DOCS] Error computing coverage:", error);
    res.status(500).json({ message: "Failed to compute coverage" });
  }
});

router.post("/sync", (req, res) => {
  try {
    const allDomains = scanAllRoutes();
    const registryDir = path.join(DOCS_DIR, "17-API-REGISTRY");

    if (!fs.existsSync(registryDir)) {
      fs.mkdirSync(registryDir, { recursive: true });
    }

    const details: Array<{ domain: string; action: string; file: string }> = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    allDomains.forEach((dr) => {
      const docFilename = `${dr.domain}.md`;
      const docPath = path.join(registryDir, docFilename);

      try {
        if (fs.existsSync(docPath)) {
          const existing = fs.readFileSync(docPath, "utf-8");
          const autoSection = generateAutoSection(dr);
          const merged = mergeContent(existing, autoSection);
          fs.writeFileSync(docPath, merged, "utf-8");
          updated++;
          details.push({ domain: dr.domain, action: "updated", file: docFilename });
        } else {
          const content = createStubDocument(dr);
          fs.writeFileSync(docPath, content, "utf-8");
          created++;
          details.push({ domain: dr.domain, action: "created", file: docFilename });
        }
      } catch (err) {
        errors++;
        details.push({ domain: dr.domain, action: "error", file: docFilename });
        console.error(`[DOCS] Error syncing domain ${dr.domain}:`, err);
      }
    });

    res.json({
      success: true,
      summary: { created, updated, skipped, errors },
      details,
    });
  } catch (error) {
    console.error("[DOCS] Error syncing API docs:", error);
    res.status(500).json({ message: "Failed to sync API docs" });
  }
});

router.get("/:docPath", (req, res) => {
  try {
    const docId = req.params.docPath;

    if (docId.includes("..") || docId.includes("\\")) {
      return res.status(400).json({ message: "Invalid document path" });
    }

    const relativePath = idToPath(docId);
    const fullPath = path.resolve(DOCS_DIR, relativePath);

    if (!fullPath.startsWith(path.resolve(DOCS_DIR))) {
      return res.status(400).json({ message: "Invalid document path" });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: "Document not found" });
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    const stats = fs.statSync(fullPath);

    res.json({
      id: docId,
      filename: path.basename(fullPath),
      title: extractTitle(content, path.basename(fullPath)),
      content,
      relativePath,
      sizeBytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    });
  } catch (error) {
    console.error("[DOCS] Error reading doc:", error);
    res.status(500).json({ message: "Failed to read document" });
  }
});

export default router;
