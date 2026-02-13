import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Clock, ArrowRight } from "lucide-react";
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
  coverImageUrl: string | null;
  readingTimeMinutes: number | null;
  featured: boolean;
  categories: TaxonomyItem[];
  tags: TaxonomyItem[];
}

const BlogFeaturedPostBlock: React.FC<BlockRenderProps> = ({ data }) => {
  const title = data?.title || "";
  const [, navigate] = useLocation();
  const [post, setPost] = useState<PostListItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blog/posts?pageSize=50")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((res: { data: PostListItem[] }) => {
        const featured = res.data.find((p) => p.featured);
        setPost(featured || null);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <section className="max-w-6xl mx-auto px-4 py-12" data-testid="block-blogFeaturedPost">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-7 h-7 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </section>
    );
  }

  if (!post) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-12" data-testid="block-blogFeaturedPost">
      {title && (
        <h2 className="text-3xl font-bold text-foreground mb-8 text-center">{title}</h2>
      )}
      <article
        className="group relative grid grid-cols-1 lg:grid-cols-2 gap-0 bg-card/60 border border-border/50 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 cursor-pointer"
        onClick={() => navigate(`/blog/${post.slug}`)}
        data-testid={`featured-card-${post.slug}`}
      >
        <div className="relative aspect-[16/10] lg:aspect-auto overflow-hidden bg-muted">
          {post.coverImageUrl ? (
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-card flex items-center justify-center">
              <span className="text-6xl text-primary/20 font-bold">PP</span>
            </div>
          )}
          <div className="absolute top-4 left-4">
            <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-primary text-primary-foreground">
              Featured
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-center p-8 lg:p-10 gap-4">
          {post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.categories.map((c) => (
                <span
                  key={c.id}
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/15 text-primary"
                >
                  {c.name}
                </span>
              ))}
            </div>
          )}

          <h3 className="text-2xl lg:text-3xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
            {post.title}
          </h3>

          {post.excerpt && (
            <p className="text-muted-foreground text-base lg:text-lg leading-relaxed line-clamp-4">
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center gap-4 text-muted-foreground/70 text-sm mt-2">
            {post.publishedAt && (
              <span>
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
            {post.readingTimeMinutes != null && post.readingTimeMinutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {post.readingTimeMinutes} min read
              </span>
            )}
          </div>

          <div className="mt-2">
            <span className="inline-flex items-center gap-1.5 text-primary font-medium text-sm group-hover:gap-3 transition-all">
              Read Article <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </article>
    </section>
  );
};

export default BlogFeaturedPostBlock;
