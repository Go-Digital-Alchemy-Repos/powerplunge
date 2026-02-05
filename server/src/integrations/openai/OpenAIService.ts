import OpenAI from "openai";
import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";

export interface SeoRecommendation {
  altText: string;
  title: string;
  description: string;
  tags: string[];
}

export interface PageSeoRecommendation {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
}

export interface OpenAIConfig {
  apiKey: string;
  configured: boolean;
}

class OpenAIService {
  private client: OpenAI | null = null;
  private configCache: OpenAIConfig | null = null;
  private lastConfigFetch: number = 0;
  private CACHE_TTL = 60000;

  async getConfig(): Promise<OpenAIConfig> {
    const now = Date.now();

    if (this.configCache && now - this.lastConfigFetch < this.CACHE_TTL) {
      return this.configCache;
    }

    const settings = await storage.getIntegrationSettings();

    if (settings?.openaiConfigured && settings?.openaiApiKeyEncrypted) {
      try {
        const apiKey = decrypt(settings.openaiApiKeyEncrypted);
        if (apiKey) {
          this.configCache = { apiKey, configured: true };
          this.lastConfigFetch = now;
          return this.configCache;
        }
      } catch (error) {
        console.error("Failed to decrypt OpenAI API key");
      }
    }

    this.configCache = { apiKey: "", configured: false };
    this.lastConfigFetch = now;
    return this.configCache;
  }

  private async getClient(): Promise<OpenAI | null> {
    const config = await this.getConfig();
    if (!config.configured || !config.apiKey) {
      return null;
    }

    if (!this.client) {
      this.client = new OpenAI({ apiKey: config.apiKey });
    }
    return this.client;
  }

  async isConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    return config.configured;
  }

  clearCache(): void {
    this.configCache = null;
    this.client = null;
    this.lastConfigFetch = 0;
  }

  async generateSeoRecommendations(
    filename: string,
    mimeType: string,
    context?: { productName?: string; category?: string; pageContext?: string }
  ): Promise<SeoRecommendation | null> {
    const client = await this.getClient();
    if (!client) {
      return null;
    }

    const prompt = `Generate SEO-optimized metadata for an image file used on an e-commerce website selling cold plunge tanks.

File: ${filename}
Type: ${mimeType}
${context?.productName ? `Product: ${context.productName}` : ""}
${context?.category ? `Category: ${context.category}` : ""}
${context?.pageContext ? `Page Context: ${context.pageContext}` : ""}

Please generate:
1. Alt text (descriptive, accessible, 125 characters max)
2. Title (concise, SEO-friendly, 60 characters max)
3. Description (detailed for image search, 160 characters max)
4. Tags (5-8 relevant keywords as array)

Respond in JSON format:
{
  "altText": "...",
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ...]
}`;

    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an SEO expert specializing in e-commerce image optimization. Respond only with valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return null;
      }

      const parsed = JSON.parse(content) as SeoRecommendation;
      return {
        altText: parsed.altText || "",
        title: parsed.title || "",
        description: parsed.description || "",
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      };
    } catch (error) {
      console.error("OpenAI SEO generation error:", error);
      return null;
    }
  }

  async generatePageSeoRecommendations(
    pageTitle: string,
    pageContent: string,
    pageType: string
  ): Promise<PageSeoRecommendation | null> {
    const client = await this.getClient();
    if (!client) {
      return null;
    }

    const prompt = `Generate SEO-optimized metadata for a web page on an e-commerce site selling cold plunge tanks and recovery products.

Page Title: ${pageTitle}
Page Type: ${pageType}
Content Preview: ${pageContent.slice(0, 1000)}

Please generate SEO metadata following these best practices:
- Meta Title: 50-60 characters, include primary keyword near the start, compelling and click-worthy
- Meta Description: 150-160 characters, include a call-to-action, summarize page value proposition
- Meta Keywords: 5-8 relevant comma-separated keywords
- OG Title: Engaging title for social sharing (60 chars max)
- OG Description: Compelling social description (160 chars max)

The site sells cold plunge tanks, ice baths, and cold therapy products. Brand name is "Power Plunge".

Respond in JSON format:
{
  "metaTitle": "...",
  "metaDescription": "...",
  "metaKeywords": "keyword1, keyword2, ...",
  "ogTitle": "...",
  "ogDescription": "..."
}`;

    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an SEO expert specializing in e-commerce optimization. Create compelling, keyword-rich metadata that drives clicks and conversions. Respond only with valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return null;
      }

      const parsed = JSON.parse(content) as PageSeoRecommendation;
      return {
        metaTitle: parsed.metaTitle || "",
        metaDescription: parsed.metaDescription || "",
        metaKeywords: parsed.metaKeywords || "",
        ogTitle: parsed.ogTitle || "",
        ogDescription: parsed.ogDescription || "",
      };
    } catch (error) {
      console.error("OpenAI page SEO generation error:", error);
      return null;
    }
  }
}

export const openaiService = new OpenAIService();
