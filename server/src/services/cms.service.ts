import type { CmsHealthResponse } from "../schemas/cms.schema";
import type { InsertPage } from "@shared/schema";
import { cmsRepository } from "../repositories/cms.repository";

export class CmsService {
  getHealth(): CmsHealthResponse {
    return { ok: true };
  }

  async listPages() {
    return cmsRepository.findAll();
  }

  async getPageById(id: string) {
    return cmsRepository.findById(id);
  }

  async getHomePage() {
    return cmsRepository.findHome();
  }

  async getShopPage() {
    return cmsRepository.findShop();
  }

  async checkSlug(slug: string) {
    const existing = await cmsRepository.findBySlug(slug);
    return { available: !existing, slug };
  }

  async createPage(data: InsertPage) {
    return cmsRepository.create(data);
  }

  async updatePage(id: string, data: Partial<InsertPage>) {
    const existing = await cmsRepository.findById(id);
    if (!existing) return undefined;
    if (data.status && data.status !== "scheduled") {
      data.scheduledAt = null;
    }
    return cmsRepository.update(id, data);
  }

  async publishPage(id: string) {
    const existing = await cmsRepository.findById(id);
    if (!existing) return undefined;
    return cmsRepository.update(id, { status: "published", scheduledAt: null });
  }

  async unpublishPage(id: string) {
    const existing = await cmsRepository.findById(id);
    if (!existing) return undefined;
    return cmsRepository.update(id, { status: "draft", scheduledAt: null });
  }

  async setHomePage(id: string) {
    const existing = await cmsRepository.findById(id);
    if (!existing) return undefined;
    return cmsRepository.setHome(id);
  }

  async setShopPage(id: string) {
    const existing = await cmsRepository.findById(id);
    if (!existing) return undefined;
    return cmsRepository.setShop(id);
  }

  async deletePage(id: string) {
    const existing = await cmsRepository.findById(id);
    if (!existing) return false;
    await cmsRepository.delete(id);
    return true;
  }
}

export const cmsService = new CmsService();
