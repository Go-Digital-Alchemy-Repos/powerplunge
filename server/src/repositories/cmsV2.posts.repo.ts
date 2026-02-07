import { db } from "../../db";
import {
  posts,
  postCategories,
  postTags,
  postCategoryMap,
  postTagMap,
  postRevisions,
  postSettings,
  adminUsers,
} from "@shared/schema";
import { eq, desc, asc, and, or, ilike, inArray, sql, count } from "drizzle-orm";

export interface PostListFilters {
  status?: string;
  q?: string;
  tag?: string;
  category?: string;
  authorId?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
  sort?: string;
}

class PostsRepository {
  async findAll(filters: PostListFilters = {}) {
    const {
      status,
      q,
      tag,
      category,
      authorId,
      featured,
      page = 1,
      pageSize = 20,
      sort = "createdAt_desc",
    } = filters;

    const conditions: any[] = [];

    if (status) {
      conditions.push(eq(posts.status, status));
    }

    if (authorId) {
      conditions.push(eq(posts.authorId, authorId));
    }

    if (featured !== undefined) {
      conditions.push(eq(posts.featured, featured));
    }

    if (q) {
      conditions.push(
        or(
          ilike(posts.title, `%${q}%`),
          ilike(posts.excerpt, `%${q}%`)
        )
      );
    }

    let postIdsFromTag: string[] | undefined;
    if (tag) {
      const tagRows = await db
        .select({ postId: postTagMap.postId })
        .from(postTagMap)
        .innerJoin(postTags, eq(postTagMap.tagId, postTags.id))
        .where(eq(postTags.slug, tag));
      postIdsFromTag = tagRows.map((r) => r.postId);
      if (postIdsFromTag.length === 0) {
        return { data: [], total: 0, page, pageSize };
      }
      conditions.push(inArray(posts.id, postIdsFromTag));
    }

    let postIdsFromCategory: string[] | undefined;
    if (category) {
      const catRows = await db
        .select({ postId: postCategoryMap.postId })
        .from(postCategoryMap)
        .innerJoin(postCategories, eq(postCategoryMap.categoryId, postCategories.id))
        .where(eq(postCategories.slug, category));
      postIdsFromCategory = catRows.map((r) => r.postId);
      if (postIdsFromCategory.length === 0) {
        return { data: [], total: 0, page, pageSize };
      }
      conditions.push(inArray(posts.id, postIdsFromCategory));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [sortField, sortDir] = sort.split("_");
    const sortColumn =
      sortField === "title"
        ? posts.title
        : sortField === "publishedAt"
        ? posts.publishedAt
        : sortField === "updatedAt"
        ? posts.updatedAt
        : posts.createdAt;
    const orderFn = sortDir === "asc" ? asc : desc;

    const [totalResult] = await db
      .select({ count: count() })
      .from(posts)
      .where(whereClause);

    const data = await db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        excerpt: posts.excerpt,
        status: posts.status,
        publishedAt: posts.publishedAt,
        scheduledAt: posts.scheduledAt,
        authorId: posts.authorId,
        coverImageId: posts.coverImageId,
        ogImageId: posts.ogImageId,
        readingTimeMinutes: posts.readingTimeMinutes,
        canonicalUrl: posts.canonicalUrl,
        featured: posts.featured,
        allowIndex: posts.allowIndex,
        allowFollow: posts.allowFollow,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        contentJson: posts.contentJson,
        legacyHtml: posts.legacyHtml,
      })
      .from(posts)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      data,
      total: totalResult?.count ?? 0,
      page,
      pageSize,
    };
  }

  async findById(id: string) {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async findBySlug(slug: string) {
    const [post] = await db.select().from(posts).where(eq(posts.slug, slug));
    return post || undefined;
  }

  async create(data: typeof posts.$inferInsert) {
    const [created] = await db.insert(posts).values(data).returning();
    return created;
  }

  async update(id: string, data: Partial<typeof posts.$inferInsert>) {
    const [updated] = await db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return updated || undefined;
  }

  async remove(id: string) {
    const [deleted] = await db.delete(posts).where(eq(posts.id, id)).returning();
    return deleted || undefined;
  }

  async getCategoriesForPost(postId: string) {
    return db
      .select({
        id: postCategories.id,
        name: postCategories.name,
        slug: postCategories.slug,
        description: postCategories.description,
        createdAt: postCategories.createdAt,
      })
      .from(postCategoryMap)
      .innerJoin(postCategories, eq(postCategoryMap.categoryId, postCategories.id))
      .where(eq(postCategoryMap.postId, postId));
  }

  async getTagsForPost(postId: string) {
    return db
      .select({
        id: postTags.id,
        name: postTags.name,
        slug: postTags.slug,
        createdAt: postTags.createdAt,
      })
      .from(postTagMap)
      .innerJoin(postTags, eq(postTagMap.tagId, postTags.id))
      .where(eq(postTagMap.postId, postId));
  }

  async setCategoriesForPost(postId: string, categoryIds: string[]) {
    await db.delete(postCategoryMap).where(eq(postCategoryMap.postId, postId));
    if (categoryIds.length > 0) {
      await db.insert(postCategoryMap).values(
        categoryIds.map((categoryId) => ({ postId, categoryId }))
      );
    }
  }

  async setTagsForPost(postId: string, tagIds: string[]) {
    await db.delete(postTagMap).where(eq(postTagMap.postId, postId));
    if (tagIds.length > 0) {
      await db.insert(postTagMap).values(
        tagIds.map((tagId) => ({ postId, tagId }))
      );
    }
  }

  // Categories CRUD
  async findAllCategories() {
    return db.select().from(postCategories).orderBy(postCategories.name);
  }

  async findCategoryById(id: string) {
    const [cat] = await db.select().from(postCategories).where(eq(postCategories.id, id));
    return cat || undefined;
  }

  async findCategoryBySlug(slug: string) {
    const [cat] = await db.select().from(postCategories).where(eq(postCategories.slug, slug));
    return cat || undefined;
  }

  async createCategory(data: typeof postCategories.$inferInsert) {
    const [created] = await db.insert(postCategories).values(data).returning();
    return created;
  }

  async updateCategory(id: string, data: Partial<typeof postCategories.$inferInsert>) {
    const [updated] = await db
      .update(postCategories)
      .set(data)
      .where(eq(postCategories.id, id))
      .returning();
    return updated || undefined;
  }

  async removeCategory(id: string) {
    await db.delete(postCategoryMap).where(eq(postCategoryMap.categoryId, id));
    const [deleted] = await db.delete(postCategories).where(eq(postCategories.id, id)).returning();
    return deleted || undefined;
  }

  // Tags CRUD
  async findAllTags() {
    return db.select().from(postTags).orderBy(postTags.name);
  }

  async findTagById(id: string) {
    const [tag] = await db.select().from(postTags).where(eq(postTags.id, id));
    return tag || undefined;
  }

  async findTagBySlug(slug: string) {
    const [tag] = await db.select().from(postTags).where(eq(postTags.slug, slug));
    return tag || undefined;
  }

  async createTag(data: typeof postTags.$inferInsert) {
    const [created] = await db.insert(postTags).values(data).returning();
    return created;
  }

  async updateTag(id: string, data: Partial<typeof postTags.$inferInsert>) {
    const [updated] = await db
      .update(postTags)
      .set(data)
      .where(eq(postTags.id, id))
      .returning();
    return updated || undefined;
  }

  async removeTag(id: string) {
    await db.delete(postTagMap).where(eq(postTagMap.tagId, id));
    const [deleted] = await db.delete(postTags).where(eq(postTags.id, id)).returning();
    return deleted || undefined;
  }

  // Revisions
  async createRevision(data: typeof postRevisions.$inferInsert) {
    const [created] = await db.insert(postRevisions).values(data).returning();
    return created;
  }

  async findRevisionsByPostId(postId: string) {
    return db
      .select()
      .from(postRevisions)
      .where(eq(postRevisions.postId, postId))
      .orderBy(desc(postRevisions.createdAt));
  }

  // Settings
  async getSettings() {
    const [settings] = await db.select().from(postSettings).limit(1);
    return settings || undefined;
  }

  async upsertSettings(data: Partial<typeof postSettings.$inferInsert>) {
    const existing = await this.getSettings();
    if (existing) {
      const [updated] = await db
        .update(postSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(postSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(postSettings).values(data).returning();
    return created;
  }
}

export const postsRepository = new PostsRepository();
