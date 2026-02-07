import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Search, ChevronLeft, ChevronRight, X, ArrowLeft, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SeoHead from "@/components/SeoHead";
import PageRenderer from "@/components/PageRenderer";
import PostCard from "./components/PostCard";

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

interface CmsPage {
  id: string;
  title: string;
  contentJson: { version: number; blocks: any[] } | null;
  content: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}

function CmsBlogPage({ pageId }: { pageId: string }) {
  const { data: cmsPage, isLoading } = useQuery<CmsPage>({
    queryKey: ["/api/pages/by-id", pageId],
    queryFn: async () => {
      const res = await fetch(`/api/pages/by-id/${pageId}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!cmsPage?.contentJson?.blocks?.length) {
    return <DefaultBlogIndex />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white" data-testid="blog-cms-page">
      <SeoHead
        pageTitle={`${cmsPage.metaTitle || cmsPage.title || "Blog"} | Power Plunge`}
        metaTitle={cmsPage.metaTitle || cmsPage.title}
        metaDescription={cmsPage.metaDescription || undefined}
      />
      <PageRenderer contentJson={cmsPage.contentJson} legacyContent={cmsPage.content} />
    </div>
  );
}

function DefaultBlogIndex() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);

  const initialPage = Math.max(1, parseInt(params.get("page") || "1"));
  const initialQ = params.get("q") || "";
  const initialTag = params.get("tag") || "";
  const initialCategory = params.get("category") || "";

  const [page, setPage] = useState(initialPage);
  const [searchInput, setSearchInput] = useState(initialQ);
  const [q, setQ] = useState(initialQ);
  const [tag, setTag] = useState(initialTag);
  const [category, setCategory] = useState(initialCategory);

  const buildQueryString = () => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("pageSize", "12");
    if (q) qs.set("q", q);
    if (tag) qs.set("tag", tag);
    if (category) qs.set("category", category);
    return qs.toString();
  };

  const { data: result, isLoading } = useQuery<PostListResult>({
    queryKey: ["/api/blog/posts", page, q, tag, category],
    queryFn: async () => {
      const res = await fetch(`/api/blog/posts?${buildQueryString()}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
  });

  const { data: categories } = useQuery<TaxonomyItem[]>({
    queryKey: ["/api/blog/categories"],
    queryFn: async () => {
      const res = await fetch("/api/blog/categories");
      return res.ok ? res.json() : [];
    },
  });

  const { data: tags } = useQuery<TaxonomyItem[]>({
    queryKey: ["/api/blog/tags"],
    queryFn: async () => {
      const res = await fetch("/api/blog/tags");
      return res.ok ? res.json() : [];
    },
  });

  useEffect(() => {
    const qs = new URLSearchParams();
    if (page > 1) qs.set("page", String(page));
    if (q) qs.set("q", q);
    if (tag) qs.set("tag", tag);
    if (category) qs.set("category", category);
    const newSearch = qs.toString();
    const path = newSearch ? `/blog?${newSearch}` : "/blog";
    window.history.replaceState(null, "", path);
  }, [page, q, tag, category]);

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0;
  const posts = result?.data || [];
  const hasFilters = q || tag || category;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setQ("");
    setSearchInput("");
    setTag("");
    setCategory("");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <SeoHead
        pageTitle="Blog | Power Plunge"
        metaTitle="Blog | Power Plunge"
        metaDescription="Cold plunge tips, guides, and the latest from Power Plunge."
        ogTitle="Blog | Power Plunge"
        ogDescription="Cold plunge tips, guides, and the latest from Power Plunge."
      />

      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="text-slate-300 hover:text-white" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" /> Home
          </Button>
          <h1 className="text-xl font-bold text-cyan-400" data-testid="text-blog-title">Blog</h1>
          <a href="/api/blog/rss.xml" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-cyan-400 transition-colors" data-testid="link-rss">
            <Rss className="w-5 h-5" />
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row gap-4 mb-8" data-testid="blog-filters">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search posts..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 bg-slate-800 border-slate-700 text-white"
                data-testid="input-search-blog"
              />
            </div>
            <Button type="submit" variant="secondary" data-testid="button-search-blog">
              Search
            </Button>
          </form>

          {categories && categories.length > 0 && (
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm"
              data-testid="select-category-filter"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          )}

          {tags && tags.length > 0 && (
            <select
              value={tag}
              onChange={(e) => { setTag(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm"
              data-testid="select-tag-filter"
            >
              <option value="">All Tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.slug}>{t.name}</option>
              ))}
            </select>
          )}
        </div>

        {hasFilters && (
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm text-slate-400">Filters:</span>
            {q && (
              <span className="text-xs bg-cyan-500/15 text-cyan-400 px-2.5 py-1 rounded-full flex items-center gap-1">
                "{q}" <X className="w-3 h-3 cursor-pointer" onClick={() => { setQ(""); setSearchInput(""); }} />
              </span>
            )}
            {category && (
              <span className="text-xs bg-cyan-500/15 text-cyan-400 px-2.5 py-1 rounded-full flex items-center gap-1">
                {categories?.find(c => c.slug === category)?.name || category} <X className="w-3 h-3 cursor-pointer" onClick={() => setCategory("")} />
              </span>
            )}
            {tag && (
              <span className="text-xs bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                #{tags?.find(t => t.slug === tag)?.name || tag} <X className="w-3 h-3 cursor-pointer" onClick={() => setTag("")} />
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-slate-500" data-testid="button-clear-filters">
              Clear all
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-24" data-testid="blog-loading">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="text-center py-24" data-testid="blog-empty">
            <p className="text-slate-400 text-lg mb-2">No posts found</p>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="text-cyan-400">
                Clear filters
              </Button>
            )}
          </div>
        )}

        {!isLoading && posts.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="blog-posts-grid">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  slug={post.slug}
                  title={post.title}
                  excerpt={post.excerpt}
                  publishedAt={post.publishedAt}
                  readingTimeMinutes={post.readingTimeMinutes}
                  coverImageId={post.coverImageId}
                  categories={post.categories}
                  tags={post.tags}
                  featured={post.featured}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10" data-testid="blog-pagination">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="border-slate-700"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-slate-400" data-testid="text-page-info">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="border-slate-700"
                  data-testid="button-next-page"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="bg-slate-800 border-t border-slate-700 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <p>&copy; 2026 Power Plunge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function BlogIndexPage() {
  const { data: siteSettings, isLoading } = useQuery<{ blogPageId: string | null }>({
    queryKey: ["/api/site-settings"],
    queryFn: async () => {
      const res = await fetch("/api/site-settings");
      return res.ok ? res.json() : { blogPageId: null };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (siteSettings?.blogPageId) {
    return <CmsBlogPage pageId={siteSettings.blogPageId} />;
  }

  return <DefaultBlogIndex />;
}
