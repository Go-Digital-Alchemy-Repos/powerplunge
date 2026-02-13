import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteLayout from "@/components/SiteLayout";

export default function LegalPage() {
  useRoute("/privacy-policy");
  const [matchTerms] = useRoute("/terms-and-conditions");

  const type = matchTerms ? "terms-and-conditions" : "privacy-policy";
  const title = type === "privacy-policy" ? "Privacy Policy" : "Terms & Conditions";

  const { data, isLoading } = useQuery<{ content: string | null; companyName: string }>({
    queryKey: ["/api/site-settings/legal", type],
    queryFn: async () => {
      const res = await fetch(`/api/site-settings/legal/${type}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  return (
    <SiteLayout>
      <div className="max-w-4xl mx-auto px-6 py-16" data-testid={`page-${type}`}>
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="text-primary hover:text-primary/80 hover:bg-primary/10 mb-6 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-4xl font-bold mb-8" data-testid="legal-page-title">{title}</h1>
        {isLoading ? (
          <div className="text-muted-foreground py-12 text-center">Loading...</div>
        ) : data?.content ? (
          <div
            className="prose prose-invert prose-lg max-w-none
              prose-headings:text-foreground prose-p:text-muted-foreground
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground prose-li:text-muted-foreground
              prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: data.content }}
            data-testid="legal-content"
          />
        ) : (
          <div className="text-muted-foreground py-12 text-center" data-testid="legal-no-content">
            <p>This page has not been set up yet.</p>
            <p className="text-sm mt-2">If you are the site owner, you can add content in Admin Settings under the Legal tab.</p>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
