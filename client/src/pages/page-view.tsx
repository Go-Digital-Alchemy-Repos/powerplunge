import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string | null;
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

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} data-testid="button-home">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
          <h1 className="text-xl font-bold text-cyan-400">{page.title}</h1>
          <div></div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <article 
          className="prose prose-invert prose-lg max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-cyan-400 prose-strong:text-white prose-li:text-slate-300"
          dangerouslySetInnerHTML={{ __html: page.content || "" }}
          data-testid="page-content"
        />
      </main>

      <footer className="bg-slate-800 border-t border-slate-700 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <p>© 2026 Power Plunge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
