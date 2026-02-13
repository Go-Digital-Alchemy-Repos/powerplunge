import { postsRepository, type PostListFilters } from "../repositories/cms.posts.repo";
import type { PostStatus } from "../schemas/cms.posts.schema";

class PostsService {
  // ── Posts ──────────────────────────────────────────────────

  async list(filters: PostListFilters) {
    return postsRepository.findAll(filters);
  }

  async getById(id: string) {
    const post = await postsRepository.findById(id);
    if (!post) return undefined;

    const [categories, tags] = await Promise.all([
      postsRepository.getCategoriesForPost(id),
      postsRepository.getTagsForPost(id),
    ]);

    return { ...post, categories, tags };
  }

  async create(data: {
    title: string;
    slug: string;
    excerpt?: string | null;
    contentJson?: unknown;
    legacyHtml?: string | null;
    status?: string;
    publishedAt?: string | null;
    scheduledAt?: string | null;
    authorId?: string | null;
    coverImageId?: string | null;
    ogImageId?: string | null;
    readingTimeMinutes?: number | null;
    canonicalUrl?: string | null;
    featured?: boolean;
    allowIndex?: boolean;
    allowFollow?: boolean;
    sidebarId?: string | null;
    customCss?: string | null;
    categoryIds?: string[];
    tagIds?: string[];
  }) {
    const { categoryIds = [], tagIds = [], ...postData } = data;

    const existing = await postsRepository.findBySlug(postData.slug);
    if (existing) {
      throw new SlugConflictError(postData.slug);
    }

    const status = (postData.status || "draft") as PostStatus;
    this.validateStatusRequirements(status, postData.publishedAt, postData.scheduledAt);

    const dbData: any = {
      ...postData,
      status,
      publishedAt: postData.publishedAt ? new Date(postData.publishedAt) : null,
      scheduledAt: postData.scheduledAt ? new Date(postData.scheduledAt) : null,
    };

    const post = await postsRepository.create(dbData);

    if (categoryIds.length > 0) {
      await postsRepository.setCategoriesForPost(post.id, categoryIds);
    }
    if (tagIds.length > 0) {
      await postsRepository.setTagsForPost(post.id, tagIds);
    }

    return this.getById(post.id);
  }

  async update(
    id: string,
    data: {
      title?: string;
      slug?: string;
      excerpt?: string | null;
      contentJson?: unknown;
      legacyHtml?: string | null;
      status?: string;
      publishedAt?: string | null;
      scheduledAt?: string | null;
      authorId?: string | null;
      coverImageId?: string | null;
      ogImageId?: string | null;
      readingTimeMinutes?: number | null;
      canonicalUrl?: string | null;
      featured?: boolean;
      allowIndex?: boolean;
      allowFollow?: boolean;
      sidebarId?: string | null;
      customCss?: string | null;
      categoryIds?: string[];
      tagIds?: string[];
    }
  ) {
    const existing = await postsRepository.findById(id);
    if (!existing) return undefined;

    const { categoryIds, tagIds, ...postData } = data;

    if (postData.slug && postData.slug !== existing.slug) {
      const slugExists = await postsRepository.findBySlug(postData.slug);
      if (slugExists) {
        throw new SlugConflictError(postData.slug);
      }
    }

    const resolvedStatus = (postData.status || existing.status) as PostStatus;
    const resolvedPublishedAt = postData.publishedAt !== undefined ? postData.publishedAt : existing.publishedAt?.toISOString() ?? null;
    const resolvedScheduledAt = postData.scheduledAt !== undefined ? postData.scheduledAt : existing.scheduledAt?.toISOString() ?? null;

    this.validateStatusRequirements(resolvedStatus, resolvedPublishedAt, resolvedScheduledAt);

    const dbData: any = { ...postData };
    if (postData.publishedAt !== undefined) {
      dbData.publishedAt = postData.publishedAt ? new Date(postData.publishedAt) : null;
    }
    if (postData.scheduledAt !== undefined) {
      dbData.scheduledAt = postData.scheduledAt ? new Date(postData.scheduledAt) : null;
    }

    await postsRepository.update(id, dbData);

    if (categoryIds !== undefined) {
      await postsRepository.setCategoriesForPost(id, categoryIds);
    }
    if (tagIds !== undefined) {
      await postsRepository.setTagsForPost(id, tagIds);
    }

    return this.getById(id);
  }

  async remove(id: string) {
    const existing = await postsRepository.findById(id);
    if (!existing) return undefined;
    return postsRepository.update(id, { status: "archived" });
  }

  async publish(id: string, userId?: string) {
    const existing = await postsRepository.findById(id);
    if (!existing) return undefined;

    const publishedAt = existing.publishedAt || new Date();

    await this.createRevisionSnapshot(id, existing, userId);

    return postsRepository.update(id, {
      status: "published",
      publishedAt,
      scheduledAt: null,
    });
  }

  async unpublish(id: string) {
    const existing = await postsRepository.findById(id);
    if (!existing) return undefined;
    return postsRepository.update(id, { status: "draft" });
  }

  async schedule(id: string, scheduledAt: string) {
    const existing = await postsRepository.findById(id);
    if (!existing) return undefined;

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      throw new ValidationError("scheduledAt must be in the future");
    }

    return postsRepository.update(id, {
      status: "scheduled",
      scheduledAt: scheduledDate,
    });
  }

  async archive(id: string) {
    const existing = await postsRepository.findById(id);
    if (!existing) return undefined;
    return postsRepository.update(id, { status: "archived" });
  }

  // ── Categories ────────────────────────────────────────────

  async listCategories() {
    return postsRepository.findAllCategories();
  }

  async listCategoriesWithCounts() {
    return postsRepository.findAllCategoriesWithCounts();
  }

  async getCategoryById(id: string) {
    return postsRepository.findCategoryById(id);
  }

  async createCategory(data: { name: string; slug: string; description?: string | null }) {
    const existing = await postsRepository.findCategoryBySlug(data.slug);
    if (existing) throw new SlugConflictError(data.slug);
    return postsRepository.createCategory(data);
  }

  async updateCategory(id: string, data: { name?: string; slug?: string; description?: string | null }) {
    const existing = await postsRepository.findCategoryById(id);
    if (!existing) return undefined;
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await postsRepository.findCategoryBySlug(data.slug);
      if (slugExists) throw new SlugConflictError(data.slug);
    }
    return postsRepository.updateCategory(id, data);
  }

  async removeCategory(id: string) {
    const existing = await postsRepository.findCategoryById(id);
    if (!existing) return undefined;
    return postsRepository.removeCategory(id);
  }

  // ── Tags ──────────────────────────────────────────────────

  async listTags() {
    return postsRepository.findAllTags();
  }

  async listTagsWithCounts() {
    return postsRepository.findAllTagsWithCounts();
  }

  async getTagById(id: string) {
    return postsRepository.findTagById(id);
  }

  async createTag(data: { name: string; slug: string }) {
    const existing = await postsRepository.findTagBySlug(data.slug);
    if (existing) throw new SlugConflictError(data.slug);
    return postsRepository.createTag(data);
  }

  async updateTag(id: string, data: { name?: string; slug?: string }) {
    const existing = await postsRepository.findTagById(id);
    if (!existing) return undefined;
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await postsRepository.findTagBySlug(data.slug);
      if (slugExists) throw new SlugConflictError(data.slug);
    }
    return postsRepository.updateTag(id, data);
  }

  async removeTag(id: string) {
    const existing = await postsRepository.findTagById(id);
    if (!existing) return undefined;
    return postsRepository.removeTag(id);
  }

  // ── Settings ──────────────────────────────────────────────

  async getSettings() {
    const settings = await postsRepository.getSettings();
    return settings || {
      postsPerPage: 12,
      blogTitle: "Blog",
      blogDescription: null,
      defaultOgImageId: null,
      rssEnabled: true,
    };
  }

  async updateSettings(data: {
    postsPerPage?: number;
    blogTitle?: string;
    blogDescription?: string | null;
    defaultOgImageId?: string | null;
    rssEnabled?: boolean;
  }) {
    return postsRepository.upsertSettings(data);
  }

  // ── Private helpers ───────────────────────────────────────

  private validateStatusRequirements(
    status: PostStatus,
    publishedAt: string | Date | null | undefined,
    scheduledAt: string | Date | null | undefined
  ) {
    if (status === "published" && !publishedAt) {
      throw new ValidationError("Published posts require a publishedAt date");
    }
    if (status === "scheduled" && !scheduledAt) {
      throw new ValidationError("Scheduled posts require a scheduledAt date");
    }
  }

  private async createRevisionSnapshot(postId: string, post: any, userId?: string) {
    try {
      await postsRepository.createRevision({
        postId,
        snapshotJson: {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          contentJson: post.contentJson,
          legacyHtml: post.legacyHtml,
          status: post.status,
          publishedAt: post.publishedAt,
          featured: post.featured,
          allowIndex: post.allowIndex,
          allowFollow: post.allowFollow,
        },
        createdByUserId: userId || null,
      });
    } catch (err) {
      console.error("[CMS-POSTS] Failed to create revision:", err);
    }
  }
}

export class SlugConflictError extends Error {
  constructor(slug: string) {
    super(`Slug "${slug}" is already in use`);
    this.name = "SlugConflictError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export const postsService = new PostsService();
