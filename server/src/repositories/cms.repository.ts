import { eq } from "drizzle-orm";
import { db } from "../../db";
import { pages } from "@shared/schema";
import type { InsertPage } from "@shared/schema";

export class CmsRepository {
  async findAll() {
    return db.select().from(pages).orderBy(pages.navOrder);
  }

  async findById(id: string) {
    const [page] = await db.select().from(pages).where(eq(pages.id, id));
    return page || undefined;
  }

  async findBySlug(slug: string) {
    const [page] = await db.select().from(pages).where(eq(pages.slug, slug));
    return page || undefined;
  }

  async findHome() {
    const [page] = await db.select().from(pages).where(eq(pages.isHome, true));
    return page || undefined;
  }

  async findShop() {
    const [page] = await db.select().from(pages).where(eq(pages.isShop, true));
    return page || undefined;
  }

  async create(data: InsertPage) {
    return db.transaction(async (tx) => {
      if (data.isHome) {
        await tx.update(pages).set({ isHome: false }).where(eq(pages.isHome, true));
      }
      if (data.isShop) {
        await tx.update(pages).set({ isShop: false }).where(eq(pages.isShop, true));
      }
      const [created] = await tx.insert(pages).values(data).returning();
      return created;
    });
  }

  async update(id: string, data: Partial<InsertPage>) {
    return db.transaction(async (tx) => {
      if (data.isHome) {
        await tx.update(pages).set({ isHome: false }).where(eq(pages.isHome, true));
      }
      if (data.isShop) {
        await tx.update(pages).set({ isShop: false }).where(eq(pages.isShop, true));
      }
      const [updated] = await tx
        .update(pages)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(pages.id, id))
        .returning();
      return updated;
    });
  }

  async setHome(id: string) {
    return db.transaction(async (tx) => {
      await tx.update(pages).set({ isHome: false }).where(eq(pages.isHome, true));
      const [updated] = await tx
        .update(pages)
        .set({ isHome: true, updatedAt: new Date() })
        .where(eq(pages.id, id))
        .returning();
      return updated;
    });
  }

  async setShop(id: string) {
    return db.transaction(async (tx) => {
      await tx.update(pages).set({ isShop: false }).where(eq(pages.isShop, true));
      const [updated] = await tx
        .update(pages)
        .set({ isShop: true, updatedAt: new Date() })
        .where(eq(pages.id, id))
        .returning();
      return updated;
    });
  }

  async delete(id: string) {
    await db.delete(pages).where(eq(pages.id, id));
  }
}

export const cmsRepository = new CmsRepository();
