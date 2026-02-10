interface ContentBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

interface ContentJson {
  version?: number;
  blocks: ContentBlock[];
}

const KNOWN_BLOCK_TYPES = new Set([
  "hero",
  "richText",
  "image",
  "imageGrid",
  "featureList",
  "testimonials",
  "faq",
  "callToAction",
  "productGrid",
  "productHighlight",
  "trustBar",
  "comparisonTable",
  "benefitStack",
  "scienceExplainer",
  "protocolBuilder",
  "recoveryUseCases",
  "safetyChecklist",
  "guaranteeAndWarranty",
  "deliveryAndSetup",
  "financingAndPayment",
  "objectionBusters",
  "beforeAfterExpectations",
  "pressMentions",
  "socialProofStats",
  "sectionRef",
  "blogFeaturedPost",
  "blogPostFeed",
  "spacer",
  "divider",
  "header",
  "footer",
  "banner",
  "video",
  "html",
]);

export function validateContentJson(
  raw: unknown
): { valid: true; data: ContentJson; warnings: string[] } | { valid: false; error: string } {
  if (raw === null || raw === undefined) {
    return { valid: true, data: { version: 1, blocks: [] }, warnings: [] };
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, error: "contentJson must be a JSON object, not an array or primitive" };
  }

  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.blocks)) {
    return { valid: false, error: "contentJson.blocks must be an array" };
  }

  const warnings: string[] = [];

  for (let i = 0; i < obj.blocks.length; i++) {
    const block = obj.blocks[i] as Record<string, unknown>;

    if (!block || typeof block !== "object" || Array.isArray(block)) {
      return { valid: false, error: `contentJson.blocks[${i}] must be a JSON object` };
    }

    if (typeof block.id !== "string" || block.id.trim() === "") {
      return { valid: false, error: `contentJson.blocks[${i}].id must be a non-empty string` };
    }

    if (typeof block.type !== "string" || block.type.trim() === "") {
      return { valid: false, error: `contentJson.blocks[${i}].type must be a non-empty string` };
    }

    if (!KNOWN_BLOCK_TYPES.has(block.type)) {
      warnings.push(`Unknown block type "${block.type}" at blocks[${i}] — will render as fallback`);
    }

    if (block.data !== undefined && (typeof block.data !== "object" || block.data === null || Array.isArray(block.data))) {
      return { valid: false, error: `contentJson.blocks[${i}].data must be a JSON object` };
    }
  }

  return {
    valid: true,
    data: obj as unknown as ContentJson,
    warnings,
  };
}

const SCRIPT_TAG_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi;
const EVENT_HANDLER_RE = /\s+on\w+\s*=\s*["'][^"']*["']/gi;
const JAVASCRIPT_URI_RE = /href\s*=\s*["']javascript:[^"']*["']/gi;

export function sanitizeHtml(html: string): string {
  let result = html;
  result = result.replace(SCRIPT_TAG_RE, "");
  result = result.replace(EVENT_HANDLER_RE, "");
  result = result.replace(JAVASCRIPT_URI_RE, 'href="#"');
  return result;
}
