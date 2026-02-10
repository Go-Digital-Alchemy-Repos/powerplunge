import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageRenderer from "@/components/PageRenderer";
import SiteLayout from "@/components/SiteLayout";
import SeoHead from "@/components/SeoHead";
import PostMeta from "./components/PostMeta";
import PostTaxonomy from "./components/PostTaxonomy";
import PostCard from "./components/PostCard";

interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  legacyHtml: string | null;
  contentJson: { version: number; blocks: any[] } | null;
  publishedAt: string | null;
  coverImageId: string | null;
  coverImageUrl: string | null;
  ogImageId: string | null;
  readingTimeMinutes: number | null;
  featured: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  allowIndex: boolean;
  allowFollow: boolean;
  categories: TaxonomyItem[];
  tags: TaxonomyItem[];
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

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();

  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: [`/api/blog/posts/${params.slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/blog/posts/${params.slug}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("NOT_FOUND");
        throw new Error("Failed to fetch post");
      }
      return res.json();
    },
    enabled: !!params.slug,
  });

  const { data: relatedResult } = useQuery<{ data: PostListItem[] }>({
    queryKey: ["/api/blog/posts", "related", post?.categories?.[0]?.slug, post?.tags?.[0]?.slug, post?.id],
    queryFn: async () => {
      const catSlug = post?.categories?.[0]?.slug;
      const tagSlug = post?.tags?.[0]?.slug;
      const qs = new URLSearchParams({ pageSize: "4" });
      if (catSlug) qs.set("category", catSlug);
      else if (tagSlug) qs.set("tag", tagSlug);
      const res = await fetch(`/api/blog/posts?${qs.toString()}`);
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: !!post,
  });

  const relatedPosts = (relatedResult?.data || []).filter((p) => p.id !== post?.id).slice(0, 3);

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </SiteLayout>
    );
  }

  if (error || !post) {
    const isNotFound = error?.message === "NOT_FOUND";
    return (
      <SiteLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <h1 className="text-4xl font-bold mb-4 text-foreground" data-testid="text-post-not-found">
            {isNotFound ? "Post Not Found" : "Something went wrong"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isNotFound ? "This post may have been removed or is not yet published." : "Unable to load this post."}
          </p>
          <Button onClick={() => navigate("/blog")} className="bg-primary hover:bg-primary/90" data-testid="button-back-to-blog">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const robotsDirectives: string[] = [];
  if (!post.allowIndex) robotsDirectives.push("noindex");
  if (!post.allowFollow) robotsDirectives.push("nofollow");
  const robotsMeta = robotsDirectives.length > 0 ? robotsDirectives.join(", ") : null;

  const coverSrc = post.coverImageUrl || (post.coverImageId ? `/api/object-storage/${post.coverImageId}` : null);
  const ogImage = post.ogImageId ? `/api/object-storage/${post.ogImageId}` : coverSrc;
  const hasBlocks = post.contentJson?.blocks && post.contentJson.blocks.length > 0;

  return (
    <SiteLayout>
      <SeoHead
        pageTitle={`${post.metaTitle || post.title} | Power Plunge`}
        metaTitle={post.metaTitle || post.title}
        metaDescription={post.metaDescription || post.excerpt || undefined}
        canonicalUrl={post.canonicalUrl || undefined}
        robots={robotsMeta}
        ogTitle={post.metaTitle || post.title}
        ogDescription={post.metaDescription || post.excerpt || undefined}
        ogImage={ogImage}
        twitterCard="summary_large_image"
        twitterTitle={post.metaTitle || post.title}
        twitterDescription={post.metaDescription || post.excerpt || undefined}
        twitterImage={ogImage}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.publishedAt,
          image: ogImage,
        }}
      />

      <article className="max-w-4xl mx-auto px-6 py-10" data-testid="blog-post-article">
        <Button
          variant="ghost"
          onClick={() => navigate("/blog")}
          className="text-muted-foreground hover:text-foreground mb-6 -ml-2"
          data-testid="button-back-to-blog"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
        </Button>

        {coverSrc && (
          <div className="aspect-video rounded-xl overflow-hidden mb-8 bg-card" data-testid="blog-post-cover">
            <img
              src={coverSrc}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="mb-4">
          <PostTaxonomy categories={post.categories} tags={post.tags} />
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight" data-testid="blog-post-title">
          {post.title}
        </h1>

        <div className="mb-8">
          <PostMeta publishedAt={post.publishedAt} readingTimeMinutes={post.readingTimeMinutes} />
        </div>

        {post.excerpt && !hasBlocks && (
          <p className="text-lg text-muted-foreground border-l-4 border-primary pl-4 mb-8 italic" data-testid="blog-post-excerpt">
            {post.excerpt}
          </p>
        )}

        <div data-testid="blog-post-content">
          {hasBlocks ? (
            <PageRenderer contentJson={post.contentJson} legacyContent={post.legacyHtml || post.body} />
          ) : (post.legacyHtml || post.body) ? (
            <div
              className="prose prose-invert prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-li:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: (post.legacyHtml || post.body)! }}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>This post has no content yet.</p>
            </div>
          )}
        </div>
      </article>

      {relatedPosts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-12 border-t border-border" data-testid="related-posts">
          <h2 className="text-2xl font-bold text-foreground mb-6">Related Posts</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((rp) => (
              <PostCard
                key={rp.id}
                slug={rp.slug}
                title={rp.title}
                excerpt={rp.excerpt}
                publishedAt={rp.publishedAt}
                readingTimeMinutes={rp.readingTimeMinutes}
                coverImageUrl={rp.coverImageUrl}
                categories={rp.categories}
                tags={rp.tags}
                featured={rp.featured}
              />
            ))}
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
