import { db } from "../db";
import {
  posts,
  postCategories,
  postTags,
  postCategoryMap,
  postTagMap,
  postSettings,
  mediaLibrary,
} from "@shared/schema";
import { eq, and, desc, or, ilike, inArray, count, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface PublicPostListFilters {
  page?: number;
  pageSize?: number;
  tag?: string;
  category?: string;
  q?: string;
}

class PublicBlogService {
  private publishedConditions() {
    return and(
      eq(posts.status, "published"),
      lte(posts.publishedAt, new Date())
    );
  }

  async listPublished(filters: PublicPostListFilters = {}) {
    const { page = 1, pageSize: requestedPageSize, tag, category, q } = filters;

    const settings = await this.getSettings();
    const pageSize = requestedPageSize || settings.postsPerPage || 12;

    const conditions: any[] = [this.publishedConditions()];

    if (q) {
      conditions.push(
        or(
          ilike(posts.title, `%${q}%`),
          ilike(posts.excerpt, `%${q}%`)
        )
      );
    }

    if (tag) {
      const tagRows = await db
        .select({ postId: postTagMap.postId })
        .from(postTagMap)
        .innerJoin(postTags, eq(postTagMap.tagId, postTags.id))
        .where(eq(postTags.slug, tag));
      const postIds = tagRows.map((r) => r.postId);
      if (postIds.length === 0) {
        return { data: [], total: 0, page, pageSize };
      }
      conditions.push(inArray(posts.id, postIds));
    }

    if (category) {
      const catRows = await db
        .select({ postId: postCategoryMap.postId })
        .from(postCategoryMap)
        .innerJoin(postCategories, eq(postCategoryMap.categoryId, postCategories.id))
        .where(eq(postCategories.slug, category));
      const postIds = catRows.map((r) => r.postId);
      if (postIds.length === 0) {
        return { data: [], total: 0, page, pageSize };
      }
      conditions.push(inArray(posts.id, postIds));
    }

    const whereClause = and(...conditions);

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
        publishedAt: posts.publishedAt,
        coverImageId: posts.coverImageId,
        coverImageUrl: mediaLibrary.publicUrl,
        ogImageId: posts.ogImageId,
        readingTimeMinutes: posts.readingTimeMinutes,
        featured: posts.featured,
        allowIndex: posts.allowIndex,
        allowFollow: posts.allowFollow,
      })
      .from(posts)
      .leftJoin(mediaLibrary, eq(posts.coverImageId, mediaLibrary.id))
      .where(whereClause)
      .orderBy(desc(posts.publishedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const postsWithTaxonomy = await Promise.all(
      data.map(async (post) => {
        const [categories, tags] = await Promise.all([
          this.getCategoriesForPost(post.id),
          this.getTagsForPost(post.id),
        ]);
        return { ...post, categories, tags };
      })
    );

    return {
      data: postsWithTaxonomy,
      total: totalResult?.count ?? 0,
      page,
      pageSize,
    };
  }

  async getPublishedBySlug(slug: string) {
    const ogMedia = alias(mediaLibrary, "og_media");
    const [result] = await db
      .select({
        post: posts,
        coverImageUrl: mediaLibrary.publicUrl,
        ogImageUrl: ogMedia.publicUrl,
      })
      .from(posts)
      .leftJoin(mediaLibrary, eq(posts.coverImageId, mediaLibrary.id))
      .leftJoin(ogMedia, eq(posts.ogImageId, ogMedia.id))
      .where(
        and(
          eq(posts.slug, slug),
          eq(posts.status, "published"),
          lte(posts.publishedAt, new Date())
        )
      );

    if (!result) return undefined;

    const post = { ...result.post, coverImageUrl: result.coverImageUrl, ogImageUrl: result.ogImageUrl };
    const [categories, tags] = await Promise.all([
      this.getCategoriesForPost(post.id),
      this.getTagsForPost(post.id),
    ]);

    return { ...post, categories, tags };
  }

  async listCategories() {
    return db.select().from(postCategories).orderBy(postCategories.name);
  }

  async listTags() {
    return db.select().from(postTags).orderBy(postTags.name);
  }

  async getSettings() {
    const [settings] = await db.select().from(postSettings).limit(1);
    return settings || {
      postsPerPage: 12,
      blogTitle: "Blog",
      blogDescription: null,
      defaultOgImageId: null,
      rssEnabled: true,
    };
  }

  async getRssItems() {
    const settings = await this.getSettings();
    if (!settings.rssEnabled) return null;

    const data = await db
      .select({
        slug: posts.slug,
        title: posts.title,
        excerpt: posts.excerpt,
        publishedAt: posts.publishedAt,
        coverImageId: posts.coverImageId,
      })
      .from(posts)
      .where(this.publishedConditions())
      .orderBy(desc(posts.publishedAt))
      .limit(50);

    return {
      title: settings.blogTitle || "Blog",
      description: settings.blogDescription || "",
      items: data,
    };
  }

  private async getCategoriesForPost(postId: string) {
    return db
      .select({
        id: postCategories.id,
        name: postCategories.name,
        slug: postCategories.slug,
      })
      .from(postCategoryMap)
      .innerJoin(postCategories, eq(postCategoryMap.categoryId, postCategories.id))
      .where(eq(postCategoryMap.postId, postId));
  }

  private async getTagsForPost(postId: string) {
    return db
      .select({
        id: postTags.id,
        name: postTags.name,
        slug: postTags.slug,
      })
      .from(postTagMap)
      .innerJoin(postTags, eq(postTagMap.tagId, postTags.id))
      .where(eq(postTagMap.postId, postId));
  }
}

export const publicBlogService = new PublicBlogService();
