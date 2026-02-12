import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageRenderer from "@/components/PageRenderer";
import DynamicNav from "@/components/DynamicNav";
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
        <p className="text-slate-400 mb-8">The page you're looking for doesn't exist.</p>
        <Button onClick={() => navigate("/")} className="bg-cyan-500 hover:bg-cyan-600">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Button>
      </div>
    );
  }

  const hasBlocks = page.contentJson?.blocks && page.contentJson.blocks.length > 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} data-testid="button-home">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
            <DynamicNav location="main" />
          </div>
          <h1 className="text-xl font-bold text-cyan-400">{page.title}</h1>
          <div></div>
        </div>
      </header>
      
      <main data-testid="page-content">
        {hasBlocks ? (
          <PageRenderer contentJson={page.contentJson} legacyContent={page.content} />
        ) : (
          <div className="container mx-auto px-4 py-12 max-w-4xl">
            <article 
              className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-cyan-400 prose-strong:text-white prose-li:text-slate-300"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content || "") }}
            />
          </div>
        )}
      </main>

      <footer className="bg-slate-800 border-t border-slate-700 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <div className="flex items-center justify-center gap-4 mb-2">
            <Link href="/privacy-policy" className="text-slate-400 text-sm hover:text-white transition-colors" data-testid="link-privacy-policy">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="text-slate-400 text-sm hover:text-white transition-colors" data-testid="link-terms">
              Terms & Conditions
            </Link>
          </div>
          <p>© 2026 Power Plunge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
