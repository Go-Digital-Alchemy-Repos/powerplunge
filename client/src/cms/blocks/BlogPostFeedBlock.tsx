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
      className="group bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all duration-300 cursor-pointer flex flex-col"
      onClick={() => navigate(`/blog/${post.slug}`)}
      data-testid={`feed-card-${post.slug}`}
    >
      {post.coverImageId ? (
        <div className="aspect-video bg-slate-700 overflow-hidden">
          <img
            src={`/api/object-storage/${post.coverImageId}`}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-cyan-900/30 to-slate-800 flex items-center justify-center">
          <span className="text-4xl text-cyan-500/20 font-bold">PP</span>
        </div>
      )}
      <div className="p-5 flex flex-col flex-1 gap-3">
        {post.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.categories.map((c) => (
              <span key={c.id} className="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400">{c.name}</span>
            ))}
          </div>
        )}
        <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-slate-400 text-sm line-clamp-3 flex-1">{post.excerpt}</p>
        )}
        <div className="flex items-center gap-3 text-slate-500 text-xs mt-auto">
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
      className="group flex gap-5 bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all duration-300 cursor-pointer p-4"
      onClick={() => navigate(`/blog/${post.slug}`)}
      data-testid={`feed-card-${post.slug}`}
    >
      {post.coverImageId ? (
        <div className="w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-slate-700">
          <img
            src={`/api/object-storage/${post.coverImageId}`}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-48 h-32 flex-shrink-0 rounded-lg bg-gradient-to-br from-cyan-900/30 to-slate-800 flex items-center justify-center">
          <span className="text-2xl text-cyan-500/20 font-bold">PP</span>
        </div>
      )}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {post.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.categories.map((c) => (
              <span key={c.id} className="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400">{c.name}</span>
            ))}
          </div>
        )}
        <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-slate-400 text-sm line-clamp-2">{post.excerpt}</p>
        )}
        <div className="flex items-center gap-3 text-slate-500 text-xs mt-auto">
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
        if (featuredOnly) {
          setResult({ ...res, data: res.data.filter((p) => p.featured) });
        } else {
          setResult(res);
        }
        setLoading(false);
      })
      .catch(() => {
        setResult({ data: [], total: 0, page: 1, pageSize: postsPerPage });
        setLoading(false);
      });
  }, [page, q, selectedCategory, selectedTag, postsPerPage, featuredOnly]);

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
          {title && <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>}
          {description && <p className="text-slate-400 text-lg max-w-2xl mx-auto">{description}</p>}
        </div>
      )}

      {(showSearch || showCategoryFilter || showTagFilter) && (
        <div className="flex flex-col md:flex-row gap-3 mb-8" data-testid="feed-filters">
          {showSearch && (
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  data-testid="input-feed-search"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-slate-700 text-white rounded-md text-sm hover:bg-slate-600 transition-colors" data-testid="button-feed-search">
                Search
              </button>
            </form>
          )}
          {showCategoryFilter && categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm"
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
              className="bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm"
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
          <span className="text-sm text-slate-400">Active filters:</span>
          {q && (
            <span className="text-xs bg-cyan-500/15 text-cyan-400 px-2.5 py-1 rounded-full flex items-center gap-1">
              "{q}" <X className="w-3 h-3 cursor-pointer" onClick={() => { setQ(""); setSearchInput(""); }} />
            </span>
          )}
          <button onClick={() => { setQ(""); setSearchInput(""); setSelectedCategory(categorySlug); setSelectedTag(tagSlug); setPage(1); }} className="text-xs text-slate-500 hover:text-white transition-colors">
            Clear all
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-400">No posts found</p>
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
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-700 text-slate-300 rounded-md text-sm hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-700 text-slate-300 rounded-md text-sm hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
