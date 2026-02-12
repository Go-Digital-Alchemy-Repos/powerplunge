import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageRenderer from "@/components/PageRenderer";
import SiteLayout from "@/components/SiteLayout";
import { ContentWithLeftSidebar } from "@/components/SidebarRenderer";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

interface PageBlock {
  id: string;
  type: string;
  data: Record<string, any>;
  settings?: Record<string, any>;
}

interface PageContentJson {
  version: number;
  blocks: PageBlock[];
}

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  contentJson: PageContentJson | null;
  sidebarId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: string;
}

export default function PageView() {
  const [, navigate] = useLocation();
  const params = useParams<{ slug: string }>();

  const { data: page, isLoading, error } = useQuery<Page>({
    queryKey: [`/api/pages/${params.slug}`],
    enabled: !!params.slug,
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

  if (error || !page) {
    return (
      <SiteLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Page Not Found</h1>
          <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/")} className="bg-primary hover:bg-primary/90">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const hasBlocks = page.contentJson?.blocks && page.contentJson.blocks.length > 0;

  return (
    <SiteLayout>
      <ContentWithLeftSidebar sidebarId={page.sidebarId}>
        <main data-testid="page-content">
          {hasBlocks ? (
            <PageRenderer contentJson={page.contentJson} legacyContent={page.content} />
          ) : (
            <div className={`${page.sidebarId ? '' : 'container mx-auto px-4 max-w-4xl'} py-12`}>
              <article
                className="prose prose-invert prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-li:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content || "") }}
              />
            </div>
          )}
        </main>
      </ContentWithLeftSidebar>
    </SiteLayout>
  );
}
