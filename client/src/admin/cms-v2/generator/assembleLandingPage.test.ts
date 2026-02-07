import { assembleLandingPage, AssemblyInput, AssemblyResult, AssembledBlock } from "./assembleLandingPage";
import { CMS_TEMPLATES } from "../../../cms/templates/templateLibrary";
import type { CmsTemplate } from "../../../cms/templates/templateLibrary";

const LANDING = CMS_TEMPLATES.find((t) => t.id === "landing-page-v1")!;
const PRODUCT_STORY = CMS_TEMPLATES.find((t) => t.id === "product-story-v1")!;
const SALES_FUNNEL = CMS_TEMPLATES.find((t) => t.id === "sales-funnel-v1")!;

function seqIdGen(): () => string {
  let n = 0;
  return () => `block-${String(++n).padStart(4, "0")}`;
}

function baseInput(overrides: Partial<AssemblyInput> = {}): AssemblyInput {
  return {
    template: LANDING,
    primaryProductId: "",
    secondaryProductIds: [],
    sections: [],
    sectionMode: "detach",
    ctaDestination: "shop",
    themeOverride: "",
    title: "Test Page",
    slug: "test-page",
    metaTitle: "",
    metaDescription: "",
    idGenerator: seqIdGen(),
    ...overrides,
  };
}

function blockTypes(result: AssemblyResult): string[] {
  return result.contentJson.blocks.map((b) => b.type);
}

function assertAllBlocksValid(blocks: AssembledBlock[]): void {
  for (const block of blocks) {
    if (!block.id) throw new Error(`Block missing id: ${JSON.stringify(block)}`);
    if (typeof block.version !== "number") throw new Error(`Block missing version: ${block.type}`);
    if (typeof block.type !== "string" || !block.type) throw new Error(`Block missing type`);
    if (typeof block.data !== "object" || block.data === null) throw new Error(`Block ${block.type} has invalid data`);
    if (typeof block.settings !== "object" || block.settings === null) throw new Error(`Block ${block.type} has invalid settings`);
  }
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e: any) {
    failed++;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${e.message}`);
  }
}

console.log("\n=== assembleLandingPage tests ===\n");

test("deterministic: same inputs produce identical output", () => {
  const input1 = baseInput({ primaryProductId: "prod-1", secondaryProductIds: ["prod-2"] });
  const input2 = baseInput({ primaryProductId: "prod-1", secondaryProductIds: ["prod-2"] });
  const r1 = assembleLandingPage(input1);
  const r2 = assembleLandingPage(input2);
  const j1 = JSON.stringify(r1);
  const j2 = JSON.stringify(r2);
  if (j1 !== j2) throw new Error("Outputs differ for identical inputs");
});

test("all blocks have id, version, type, data, settings", () => {
  const r = assembleLandingPage(baseInput({ primaryProductId: "p1", secondaryProductIds: ["p2", "p3"] }));
  assertAllBlocksValid(r.contentJson.blocks);
});

test("contentJson has version 1", () => {
  const r = assembleLandingPage(baseInput());
  if (r.contentJson.version !== 1) throw new Error(`Expected version 1, got ${r.contentJson.version}`);
});

test("landing-page-v1 template blocks are cloned (not mutated)", () => {
  const origBlocks = JSON.stringify(LANDING.blocks);
  assembleLandingPage(baseInput({ primaryProductId: "p1" }));
  const afterBlocks = JSON.stringify(LANDING.blocks);
  if (origBlocks !== afterBlocks) throw new Error("Template was mutated");
});

test("rule 2a: existing productHighlight gets primaryProductId injected", () => {
  const r = assembleLandingPage(baseInput({ primaryProductId: "prod-abc" }));
  const ph = r.contentJson.blocks.find((b) => b.type === "productHighlight");
  if (!ph) throw new Error("productHighlight not found");
  if (ph.data.productId !== "prod-abc") throw new Error(`Expected prod-abc, got ${ph.data.productId}`);
});

test("rule 2b: productHighlight inserted after hero when template lacks one", () => {
  const noHighlightTemplate: CmsTemplate = {
    id: "test-no-ph",
    name: "No PH",
    description: "",
    tags: [],
    blocks: [
      { type: "hero", data: { headline: "Hello" } },
      { type: "featureList", data: { title: "Features" } },
    ],
  };
  const r = assembleLandingPage(baseInput({ template: noHighlightTemplate, primaryProductId: "p99" }));
  const types = blockTypes(r);
  const heroIdx = types.indexOf("hero");
  const phIdx = types.indexOf("productHighlight");
  if (phIdx < 0) throw new Error("productHighlight was not inserted");
  if (phIdx !== heroIdx + 1) throw new Error(`productHighlight at ${phIdx}, hero at ${heroIdx} — should be hero+1`);
  const ph = r.contentJson.blocks[phIdx];
  if (ph.data.productId !== "p99") throw new Error("Injected productHighlight has wrong productId");
});

test("rule 2 skip: no product = no productHighlight injection", () => {
  const noHighlightTemplate: CmsTemplate = {
    id: "test-bare",
    name: "Bare",
    description: "",
    tags: [],
    blocks: [{ type: "hero", data: {} }],
  };
  const r = assembleLandingPage(baseInput({ template: noHighlightTemplate, primaryProductId: "" }));
  const types = blockTypes(r);
  if (types.includes("productHighlight")) throw new Error("Should not insert productHighlight without primary product");
});

test("rule 3a: existing productGrid gets secondaryProductIds injected", () => {
  const withGrid: CmsTemplate = {
    id: "test-grid",
    name: "With Grid",
    description: "",
    tags: [],
    blocks: [
      { type: "hero", data: {} },
      { type: "productGrid", data: { title: "Our Products", productIds: [] } },
    ],
  };
  const r = assembleLandingPage(baseInput({ template: withGrid, secondaryProductIds: ["s1", "s2"] }));
  const grid = r.contentJson.blocks.find((b) => b.type === "productGrid");
  if (!grid) throw new Error("productGrid not found");
  if (JSON.stringify(grid.data.productIds) !== '["s1","s2"]') throw new Error("productIds not injected");
});

test("rule 3b: productGrid inserted near mid-page when absent", () => {
  const r = assembleLandingPage(baseInput({ secondaryProductIds: ["s1", "s2", "s3"] }));
  const grid = r.contentJson.blocks.find((b) => b.type === "productGrid");
  if (!grid) throw new Error("productGrid not found");
  if (grid.data.columns !== 3) throw new Error(`Expected 3 columns, got ${grid.data.columns}`);
  if (JSON.stringify(grid.data.productIds) !== '["s1","s2","s3"]') throw new Error("productIds wrong");
});

test("rule 3 skip: no secondary products = no grid injection", () => {
  const bareTemplate: CmsTemplate = {
    id: "test-bare2",
    name: "Bare",
    description: "",
    tags: [],
    blocks: [{ type: "hero", data: {} }],
  };
  const r = assembleLandingPage(baseInput({ template: bareTemplate, secondaryProductIds: [] }));
  if (blockTypes(r).includes("productGrid")) throw new Error("Grid should not be inserted");
});

test("rule 4a: sections appended in sectionRef mode", () => {
  const sections = [
    { id: "sec-1", name: "Safety", blocks: [{ type: "richText", data: { body: "Be safe" } }] },
    { id: "sec-2", name: "Setup", blocks: [{ type: "faq", data: { items: [] } }] },
  ];
  const r = assembleLandingPage(baseInput({ sections, sectionMode: "sectionRef" }));
  const refs = r.contentJson.blocks.filter((b) => b.type === "sectionRef");
  if (refs.length !== 2) throw new Error(`Expected 2 sectionRefs, got ${refs.length}`);
  if (refs[0].data.sectionId !== "sec-1") throw new Error("First ref wrong");
  if (refs[1].data.sectionName !== "Setup") throw new Error("Second ref name wrong");
});

test("rule 4b: sections appended in detach mode (blocks copied)", () => {
  const sections = [
    {
      id: "sec-1",
      name: "Benefits",
      blocks: [
        { type: "richText", data: { body: "Cold is good" } },
        { type: "featureList", data: { title: "Benefits" } },
      ],
    },
  ];
  const r = assembleLandingPage(baseInput({ sections, sectionMode: "detach" }));
  const types = blockTypes(r);
  const lastTwo = types.slice(-2);
  if (lastTwo[0] !== "richText" || lastTwo[1] !== "featureList") {
    throw new Error(`Expected [richText, featureList] at end, got ${JSON.stringify(lastTwo)}`);
  }
  if (types.includes("sectionRef")) throw new Error("sectionRef should not appear in detach mode");
});

test("rule 5: every block has id and version", () => {
  const sections = [{ id: "s1", name: "S", blocks: [{ type: "richText", data: {} }] }];
  const r = assembleLandingPage(baseInput({
    primaryProductId: "p1",
    secondaryProductIds: ["p2"],
    sections,
    sectionMode: "detach",
  }));
  assertAllBlocksValid(r.contentJson.blocks);
});

test("CTA override: shop destination", () => {
  const r = assembleLandingPage(baseInput({ ctaDestination: "shop" }));
  const hero = r.contentJson.blocks.find((b) => b.type === "hero");
  if (!hero) throw new Error("No hero");
  if (hero.data.ctaHref !== "/shop") throw new Error(`Expected /shop, got ${hero.data.ctaHref}`);
});

test("CTA override: product destination with primary product", () => {
  const r = assembleLandingPage(baseInput({ ctaDestination: "product", primaryProductId: "prod-x" }));
  const hero = r.contentJson.blocks.find((b) => b.type === "hero");
  if (hero?.data.ctaHref !== "/products/prod-x") throw new Error(`Expected /products/prod-x, got ${hero?.data.ctaHref}`);
  const cta = r.contentJson.blocks.find((b) => b.type === "callToAction");
  if (cta?.data.primaryCtaHref !== "/products/prod-x") throw new Error("CTA block not updated");
});

test("CTA override: product destination without primary falls back to /shop", () => {
  const r = assembleLandingPage(baseInput({ ctaDestination: "product", primaryProductId: "" }));
  const hero = r.contentJson.blocks.find((b) => b.type === "hero");
  if (hero?.data.ctaHref !== "/shop") throw new Error(`Expected /shop fallback, got ${hero?.data.ctaHref}`);
});

test("CTA override: quote destination sets text and href", () => {
  const r = assembleLandingPage(baseInput({ ctaDestination: "quote" }));
  const hero = r.contentJson.blocks.find((b) => b.type === "hero");
  if (hero?.data.ctaHref !== "/contact") throw new Error(`Expected /contact, got ${hero?.data.ctaHref}`);
  if (hero?.data.ctaText !== "Get a Quote") throw new Error(`Expected 'Get a Quote', got ${hero?.data.ctaText}`);
});

test("theme override stored in contentJson when set", () => {
  const r = assembleLandingPage(baseInput({ themeOverride: "arctic-dark" }));
  if (r.contentJson.themeOverride !== "arctic-dark") throw new Error("themeOverride not set");
});

test("no theme override when empty string", () => {
  const r = assembleLandingPage(baseInput({ themeOverride: "" }));
  if ("themeOverride" in r.contentJson) throw new Error("themeOverride should not be present");
});

test("SEO defaults derived from title", () => {
  const r = assembleLandingPage(baseInput({ title: "Winter Sale", metaTitle: "", metaDescription: "" }));
  if (r.seo.metaTitle !== "Winter Sale") throw new Error(`Expected 'Winter Sale', got '${r.seo.metaTitle}'`);
  if (!r.seo.metaDescription.includes("Winter Sale")) throw new Error("metaDescription should include title");
  if (r.seo.ogTitle !== r.seo.metaTitle) throw new Error("ogTitle should match metaTitle");
});

test("SEO uses explicit meta when provided", () => {
  const r = assembleLandingPage(baseInput({ metaTitle: "Custom SEO", metaDescription: "Custom desc" }));
  if (r.seo.metaTitle !== "Custom SEO") throw new Error("metaTitle not used");
  if (r.seo.metaDescription !== "Custom desc") throw new Error("metaDescription not used");
});

test("works with product-story-v1 template", () => {
  const r = assembleLandingPage(baseInput({ template: PRODUCT_STORY, primaryProductId: "p1" }));
  assertAllBlocksValid(r.contentJson.blocks);
  const types = blockTypes(r);
  if (!types.includes("productHighlight")) throw new Error("Should insert productHighlight for product-story-v1");
});

test("works with sales-funnel-v1 template", () => {
  const r = assembleLandingPage(baseInput({ template: SALES_FUNNEL, primaryProductId: "p1" }));
  assertAllBlocksValid(r.contentJson.blocks);
  const types = blockTypes(r);
  if (!types.includes("productHighlight")) throw new Error("Should insert productHighlight for sales-funnel-v1");
});

test("combined: primary + secondary + sections + theme + quote CTA", () => {
  const sections = [
    { id: "s1", name: "Safety", blocks: [{ type: "richText", data: { body: "text" } }] },
  ];
  const r = assembleLandingPage(baseInput({
    primaryProductId: "main-prod",
    secondaryProductIds: ["side-1", "side-2"],
    sections,
    sectionMode: "detach",
    ctaDestination: "quote",
    themeOverride: "midnight",
    metaTitle: "Full Test",
    metaDescription: "Full test desc",
  }));

  assertAllBlocksValid(r.contentJson.blocks);

  const ph = r.contentJson.blocks.find((b) => b.type === "productHighlight");
  if (ph?.data.productId !== "main-prod") throw new Error("Primary product wrong");

  const grid = r.contentJson.blocks.find((b) => b.type === "productGrid");
  if (JSON.stringify(grid?.data.productIds) !== '["side-1","side-2"]') throw new Error("Secondary wrong");

  const hero = r.contentJson.blocks.find((b) => b.type === "hero");
  if (hero?.data.ctaHref !== "/contact") throw new Error("CTA wrong");
  if (hero?.data.ctaText !== "Get a Quote") throw new Error("CTA text wrong");

  if (r.contentJson.themeOverride !== "midnight") throw new Error("Theme wrong");
  if (r.seo.metaTitle !== "Full Test") throw new Error("SEO title wrong");

  const lastBlock = r.contentJson.blocks[r.contentJson.blocks.length - 1];
  if (lastBlock.type !== "richText") throw new Error("Section block should be last");
});

test("sections with empty blocks array are handled gracefully", () => {
  const sections = [{ id: "empty", name: "Empty", blocks: [] }];
  const r = assembleLandingPage(baseInput({ sections, sectionMode: "detach" }));
  assertAllBlocksValid(r.contentJson.blocks);
});

test("sections with non-array blocks handled gracefully", () => {
  const sections = [{ id: "bad", name: "Bad", blocks: null as any }];
  const r = assembleLandingPage(baseInput({ sections, sectionMode: "detach" }));
  assertAllBlocksValid(r.contentJson.blocks);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
