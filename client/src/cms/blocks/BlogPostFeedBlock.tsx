import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { BlockRenderProps } from "./types";

interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
}

interface PostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  coverImageId: string | null;
  readingTimeMinutes: number | null;
  featured: boolean;
  categories: TaxonomyItem[];
  tags: TaxonomyItem[];
}

interface PostListResult {
  data: PostListItem[];
  total: number;
  page: number;
  pageSize: number;
}

function PostCardGrid({ post }: { post: PostListItem }) {
  const [, navigate] = useLocation();
  return (
    <article
      className="group bg-card/60 border border-border/50 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 cursor-pointer flex flex-col"
      onClick={() => navigate(`/blog/${post.slug}`)}
      data-testid={`feed-card-${post.slug}`}
    >
      {post.coverImageId ? (
        <div className="aspect-video bg-muted overflow-hidden">
          <img
            src={`/api/object-storage/${post.coverImageId}`}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-primary/15 to-card flex items-center justify-center">
          <span className="text-4xl text-primary/20 font-bold">PP</span>
        </div>
      )}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {post.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.categories.map((c) => (
              <span key={c.id} className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary">{c.name}</span>
            ))}
          </div>
        )}
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-muted-foreground text-sm line-clamp-3 flex-1">{post.excerpt}</p>
        )}
        <div className="flex items-center gap-3 text-muted-foreground/70 text-xs mt-auto">
          {post.publishedAt && (
            <span>{new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          )}
          {post.readingTimeMinutes != null && post.readingTimeMinutes > 0 && (
            <span>{post.readingTimeMinutes} min read</span>
          )}
        </div>
      </div>
    </article>
  );
}

function PostCardList({ post }: { post: PostListItem }) {
  const [, navigate] = useLocation();
  return (
    <article
      className="group flex gap-5 bg-card/40 border border-border/50 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 cursor-pointer p-4"
      onClick={() => navigate(`/blog/${post.slug}`)}
      data-testid={`feed-card-${post.slug}`}
    >
      {post.coverImageId ? (
        <div className="w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
          <img
            src={`/api/object-storage/${post.coverImageId}`}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-48 h-32 flex-shrink-0 rounded-lg bg-gradient-to-br from-primary/15 to-card flex items-center justify-center">
          <span className="text-2xl text-primary/20 font-bold">PP</span>
        </div>
      )}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {post.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.categories.map((c) => (
              <span key={c.id} className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary">{c.name}</span>
            ))}
          </div>
        )}
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-muted-foreground text-sm line-clamp-2">{post.excerpt}</p>
        )}
        <div className="flex items-center gap-3 text-muted-foreground/70 text-xs mt-auto">
          {post.publishedAt && (
            <span>{new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          )}
          {post.readingTimeMinutes != null && post.readingTimeMinutes > 0 && (
            <span>{post.readingTimeMinutes} min read</span>
          )}
        </div>
      </div>
    </article>
  );
}

const BlogPostFeedBlock: React.FC<BlockRenderProps> = ({ data }) => {
  const title = data?.title || "";
  const description = data?.description || "";
  const layout = data?.layout || "grid";
  const postsPerPage = parseInt(data?.postsPerPage) || 12;
  const showSearch = data?.showSearch === "true" || data?.showSearch === true;
  const showCategoryFilter = data?.showCategoryFilter === "true" || data?.showCategoryFilter === true;
  const showTagFilter = data?.showTagFilter === "true" || data?.showTagFilter === true;
  const featuredOnly = data?.featuredOnly === "true" || data?.featuredOnly === true;
  const excludeFeatured = data?.excludeFeatured === "true" || data?.excludeFeatured === true;
  const categorySlug = data?.categorySlug || "";
  const tagSlug = data?.tagSlug || "";

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categorySlug);
  const [selectedTag, setSelectedTag] = useState(tagSlug);
  const [result, setResult] = useState<PostListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [tags, setTags] = useState<TaxonomyItem[]>([]);

  useEffect(() => {
    if (showCategoryFilter) {
      fetch("/api/blog/categories").then(r => r.ok ? r.json() : []).then(setCategories).catch(() => {});
    }
    if (showTagFilter) {
      fetch("/api/blog/tags").then(r => r.ok ? r.json() : []).then(setTags).catch(() => {});
    }
  }, [showCategoryFilter, showTagFilter]);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("pageSize", String(postsPerPage));
    if (q) qs.set("q", q);
    if (selectedCategory) qs.set("category", selectedCategory);
    if (selectedTag) qs.set("tag", selectedTag);

    fetch(`/api/blog/posts?${qs.toString()}`)
      .then((r) => r.ok ? r.json() : { data: [], total: 0, page: 1, pageSize: postsPerPage })
      .then((res: PostListResult) => {
        let filtered = res.data;
        if (featuredOnly) {
          filtered = filtered.filter((p) => p.featured);
        }
        if (excludeFeatured) {
          let skipped = false;
          filtered = filtered.filter((p) => {
            if (!skipped && p.featured) {
              skipped = true;
              return false;
            }
            return true;
          });
        }
        setResult({ ...res, data: filtered });
        setLoading(false);
      })
      .catch(() => {
        setResult({ data: [], total: 0, page: 1, pageSize: postsPerPage });
        setLoading(false);
      });
  }, [page, q, selectedCategory, selectedTag, postsPerPage, featuredOnly, excludeFeatured]);

  const posts = result?.data || [];
  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(searchInput);
    setPage(1);
  };

  return (
    <section className="max-w-6xl mx-auto px-4 py-12" data-testid="block-blogPostFeed">
      {(title || description) && (
        <div className="text-center mb-8">
          {title && <h2 className="text-3xl font-bold text-foreground mb-2">{title}</h2>}
          {description && <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{description}</p>}
        </div>
      )}

      {(showSearch || showCategoryFilter || showTagFilter) && (
        <div className="flex flex-col md:flex-row gap-3 mb-8" data-testid="feed-filters">
          {showSearch && (
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-card border border-border text-foreground rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid="input-feed-search"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-muted text-foreground rounded-md text-sm hover:bg-muted/80 transition-colors" data-testid="button-feed-search">
                Search
              </button>
            </form>
          )}
          {showCategoryFilter && categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="bg-card border border-border text-foreground rounded-md px-3 py-2 text-sm"
              data-testid="select-feed-category"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          )}
          {showTagFilter && tags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => { setSelectedTag(e.target.value); setPage(1); }}
              className="bg-card border border-border text-foreground rounded-md px-3 py-2 text-sm"
              data-testid="select-feed-tag"
            >
              <option value="">All Tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.slug}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {(q || (selectedCategory && selectedCategory !== categorySlug) || (selectedTag && selectedTag !== tagSlug)) && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {q && (
            <span className="text-xs bg-primary/15 text-primary px-2.5 py-1 rounded-full flex items-center gap-1">
              "{q}" <X className="w-3 h-3 cursor-pointer" onClick={() => { setQ(""); setSearchInput(""); }} />
            </span>
          )}
          <button onClick={() => { setQ(""); setSearchInput(""); setSelectedCategory(categorySlug); setSelectedTag(tagSlug); setPage(1); }} className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors">
            Clear all
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-7 h-7 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No posts found</p>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <>
          {layout === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="feed-grid">
              {posts.map((post) => (
                <PostCardGrid key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4" data-testid="feed-list">
              {posts.map((post) => (
                <PostCardList key={post.id} post={post} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-10" data-testid="feed-pagination">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="flex items-center gap-1 px-3 py-1.5 border border-border text-foreground/80 rounded-md text-sm hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="flex items-center gap-1 px-3 py-1.5 border border-border text-foreground/80 rounded-md text-sm hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default BlogPostFeedBlock;
