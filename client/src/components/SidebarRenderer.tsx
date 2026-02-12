import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Search, Mail, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SidebarWidget {
  id: string;
  widgetType: string;
  title: string;
  settings: Record<string, any>;
  sortOrder: number;
  isActive: boolean;
}

interface SidebarData {
  id: string;
  name: string;
  widgets: SidebarWidget[];
}

function NewsletterWidget({ widget }: { widget: SidebarWidget }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const s = widget.settings;

  return (
    <div className="space-y-3" data-testid={`widget-newsletter-${widget.id}`}>
      {s.heading && <h3 className="text-sm font-semibold text-foreground">{s.heading}</h3>}
      {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
      {submitted ? (
        <p className="text-xs text-green-400">{s.successMessage || "Thanks for subscribing!"}</p>
      ) : (
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder={s.placeholderText || "Enter your email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-8 text-xs bg-muted border-border"
            data-testid="input-newsletter-email"
          />
          <Button
            size="sm"
            className="h-8 text-xs whitespace-nowrap"
            onClick={() => setSubmitted(true)}
            disabled={!email}
            data-testid="button-newsletter-subscribe"
          >
            {s.buttonText || "Subscribe"}
          </Button>
        </div>
      )}
    </div>
  );
}

interface PostListItem {
  id: string;
  slug: string;
  title: string;
  publishedAt: string | null;
  coverImageUrl: string | null;
}

function RecentPostsWidget({ widget }: { widget: SidebarWidget }) {
  const s = widget.settings;
  const count = s.postCount || 5;

  const { data } = useQuery<{ data: PostListItem[] }>({
    queryKey: ["/api/blog/posts", { pageSize: count }],
    queryFn: async () => {
      const res = await fetch(`/api/blog/posts?pageSize=${count}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
  });

  const posts = data?.data || [];

  return (
    <div className="space-y-3" data-testid={`widget-recent-posts-${widget.id}`}>
      {s.heading && <h3 className="text-sm font-semibold text-foreground">{s.heading}</h3>}
      {posts.length === 0 && <p className="text-xs text-muted-foreground">No posts yet.</p>}
      <div className="space-y-2">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="flex items-start gap-2 group"
            data-testid={`link-recent-post-${post.id}`}
          >
            {s.showThumbnail && post.coverImageUrl && (
              <img
                src={post.coverImageUrl}
                alt={post.title}
                className="w-12 h-12 rounded object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {post.title}
              </p>
              {s.showDate && post.publishedAt && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(post.publishedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function SearchWidget({ widget }: { widget: SidebarWidget }) {
  const [query, setQuery] = useState("");
  const s = widget.settings;

  const handleSearch = () => {
    if (query.trim()) {
      window.location.href = `/blog?q=${encodeURIComponent(query.trim())}`;
    }
  };

  return (
    <div className="space-y-3" data-testid={`widget-search-${widget.id}`}>
      {s.heading && <h3 className="text-sm font-semibold text-foreground">{s.heading}</h3>}
      <div className="flex gap-2">
        <Input
          placeholder={s.placeholderText || "Search posts..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="h-8 text-xs bg-muted border-border"
          data-testid="input-sidebar-search"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={handleSearch}
          data-testid="button-sidebar-search"
        >
          <Search className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function WidgetRenderer({ widget }: { widget: SidebarWidget }) {
  const ICON_MAP: Record<string, React.ElementType> = {
    newsletter_signup: Mail,
    recent_posts: FileText,
    search: Search,
  };

  const Icon = ICON_MAP[widget.widgetType] || FileText;

  return (
    <div className="p-4 border border-border rounded-lg bg-card/50" data-testid={`sidebar-widget-${widget.id}`}>
      {widget.widgetType === "newsletter_signup" && <NewsletterWidget widget={widget} />}
      {widget.widgetType === "recent_posts" && <RecentPostsWidget widget={widget} />}
      {widget.widgetType === "search" && <SearchWidget widget={widget} />}
    </div>
  );
}

export default function SidebarRenderer({ sidebarId }: { sidebarId: string }) {
  const { data: sidebar, isLoading } = useQuery<SidebarData>({
    queryKey: [`/api/sidebars/${sidebarId}`],
    queryFn: async () => {
      const res = await fetch(`/api/sidebars/${sidebarId}`);
      if (!res.ok) throw new Error("Failed to fetch sidebar");
      return res.json();
    },
    enabled: !!sidebarId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-card/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!sidebar || !sidebar.widgets || sidebar.widgets.length === 0) return null;

  return (
    <aside className="space-y-4" data-testid="sidebar-renderer">
      {sidebar.widgets.map((widget) => (
        <WidgetRenderer key={widget.id} widget={widget} />
      ))}
    </aside>
  );
}

export function ContentWithLeftSidebar({
  sidebarId,
  children,
}: {
  sidebarId: string | null | undefined;
  children: React.ReactNode;
}) {
  if (!sidebarId) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10" data-testid="layout-with-sidebar">
      <div className="flex gap-8">
        <div className="w-72 flex-shrink-0 hidden lg:block" data-testid="sidebar-column">
          <div className="sticky top-6">
            <SidebarRenderer sidebarId={sidebarId} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
