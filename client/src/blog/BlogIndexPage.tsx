import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Search, ChevronLeft, ChevronRight, X, Rss, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SeoHead from "@/components/SeoHead";
import PageRenderer from "@/components/PageRenderer";
import SiteLayout from "@/components/SiteLayout";
import PostCard from "./components/PostCard";
import PostMeta from "./components/PostMeta";
import PostTaxonomy from "./components/PostTaxonomy";

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
  coverImageUrl: string | null;
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
      <SiteLayout>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </SiteLayout>
    );
  }

  if (!cmsPage?.contentJson?.blocks?.length) {
    return <DefaultBlogIndex />;
  }

  return (
    <SiteLayout>
      <SeoHead
        pageTitle={`${cmsPage.metaTitle || cmsPage.title || "Blog"} | Power Plunge`}
        metaTitle={cmsPage.metaTitle || cmsPage.title}
        metaDescription={cmsPage.metaDescription || undefined}
      />
      <div data-testid="blog-cms-page">
        <PageRenderer contentJson={cmsPage.contentJson} legacyContent={cmsPage.content} />
      </div>
    </SiteLayout>
  );
}

function FeaturedPostCard({ post }: { post: PostListItem }) {
  const [, navigate] = useLocation();
  const coverSrc = post.coverImageUrl;
  const excerptText = post.excerpt
    ? post.excerpt.length > 300
      ? post.excerpt.slice(0, 297) + "..."
      : post.excerpt
    : null;

  return (
    <article
      className="group mb-10 bg-card/60 border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 cursor-pointer"
      onClick={() => navigate(`/blog/${post.slug}`)}
      data-testid="featured-post-card"
    >
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/2 aspect-video md:aspect-auto md:min-h-[320px] bg-muted overflow-hidden relative">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-card flex items-center justify-center">
              <span className="text-6xl text-primary/20 font-bold">PP</span>
            </div>
          )}
          <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full" data-testid="featured-badge">
            Featured
          </span>
        </div>
        <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center gap-4">
          <PostTaxonomy categories={post.categories} tags={post.tags} linkable={false} />
          <h2
            className="text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight"
            data-testid="featured-post-title"
          >
            {post.title}
          </h2>
          <PostMeta publishedAt={post.publishedAt} readingTimeMinutes={post.readingTimeMinutes} />
          {excerptText && (
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed line-clamp-4" data-testid="featured-post-excerpt">
              {excerptText}
            </p>
          )}
          <div>
            <span className="inline-flex items-center gap-1.5 text-primary font-medium text-sm group-hover:gap-2.5 transition-all" data-testid="featured-read-more">
              Read more <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </article>
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
  const allPosts = result?.data || [];
  const hasFilters = q || tag || category;

  const { featuredPost, posts } = useMemo(() => {
    if (hasFilters || page > 1 || allPosts.length === 0) {
      return { featuredPost: null, posts: allPosts };
    }
    const explicitlyFeatured = allPosts
      .filter((p) => p.featured)
      .sort((a, b) => {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      });
    const chosen = explicitlyFeatured.length > 0 ? explicitlyFeatured[0] : allPosts[0];
    return {
      featuredPost: chosen,
      posts: allPosts.filter((p) => p.id !== chosen.id),
    };
  }, [allPosts, hasFilters, page]);

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
    <SiteLayout>
      <SeoHead
        pageTitle="Blog | Power Plunge"
        metaTitle="Blog | Power Plunge"
        metaDescription="Cold plunge tips, guides, and the latest from Power Plunge."
        ogTitle="Blog | Power Plunge"
        ogDescription="Cold plunge tips, guides, and the latest from Power Plunge."
      />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground" data-testid="text-blog-title">Blog</h1>
            <p className="text-muted-foreground mt-1">Cold plunge tips, guides, and the latest from Power Plunge.</p>
          </div>
          <a href="/api/blog/rss.xml" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-rss">
            <Rss className="w-5 h-5" />
          </a>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8" data-testid="blog-filters">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 bg-card border-border text-foreground"
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
              className="bg-card border border-border text-foreground rounded-md px-3 py-2 text-sm"
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
              className="bg-card border border-border text-foreground rounded-md px-3 py-2 text-sm"
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
            <span className="text-sm text-muted-foreground">Filters:</span>
            {q && (
              <span className="text-xs bg-primary/15 text-primary px-2.5 py-1 rounded-full flex items-center gap-1">
                "{q}" <X className="w-3 h-3 cursor-pointer" onClick={() => { setQ(""); setSearchInput(""); }} />
              </span>
            )}
            {category && (
              <span className="text-xs bg-primary/15 text-primary px-2.5 py-1 rounded-full flex items-center gap-1">
                {categories?.find(c => c.slug === category)?.name || category} <X className="w-3 h-3 cursor-pointer" onClick={() => setCategory("")} />
              </span>
            )}
            {tag && (
              <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full flex items-center gap-1">
                #{tags?.find(t => t.slug === tag)?.name || tag} <X className="w-3 h-3 cursor-pointer" onClick={() => setTag("")} />
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground" data-testid="button-clear-filters">
              Clear all
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-24" data-testid="blog-loading">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {!isLoading && allPosts.length === 0 && (
          <div className="text-center py-24" data-testid="blog-empty">
            <p className="text-muted-foreground text-lg mb-2">No posts found</p>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="text-primary">
                Clear filters
              </Button>
            )}
          </div>
        )}

        {!isLoading && (allPosts.length > 0) && (
          <>
            {featuredPost && (
              <FeaturedPostCard post={featuredPost} />
            )}

            {posts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="blog-posts-grid">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  slug={post.slug}
                  title={post.title}
                  excerpt={post.excerpt}
                  publishedAt={post.publishedAt}
                  readingTimeMinutes={post.readingTimeMinutes}
                  coverImageUrl={post.coverImageUrl}
                  categories={post.categories}
                  tags={post.tags}
                  featured={post.featured}
                />
              ))}
            </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10" data-testid="blog-pagination">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="border-border"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="border-border"
                  data-testid="button-next-page"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </SiteLayout>
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
      <SiteLayout>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </SiteLayout>
    );
  }

  if (siteSettings?.blogPageId) {
    return <CmsBlogPage pageId={siteSettings.blogPageId} />;
  }

  return <DefaultBlogIndex />;
}
