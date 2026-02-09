import { useAdmin } from "@/hooks/use-admin";
import { useQuery } from "@tanstack/react-query";
import CmsV2Layout from "@/components/admin/CmsV2Layout";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminCmsV2Seo() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();

  const { data: pages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/cms-v2/pages"],
    enabled: hasFullAccess,
  });

  if (adminLoading || !hasFullAccess) {
    return (
      <CmsV2Layout activeNav="seo" breadcrumbs={[{ label: "SEO" }]}>
        <div className="p-8 text-center text-muted-foreground">{adminLoading ? "Loading..." : "Access Denied"}</div>
      </CmsV2Layout>
    );
  }

  const pagesWithScores = (pages || []).map((page: any) => {
    const hasTitle = !!page.metaTitle;
    const hasDesc = !!page.metaDescription;
    const hasOg = !!page.ogTitle || !!page.ogImage;
    return { ...page, hasTitle, hasDesc, hasOg, score: [hasTitle, hasDesc, hasOg].filter(Boolean).length };
  });

  const avgScore = pagesWithScores.length > 0
    ? (pagesWithScores.reduce((s: number, p: any) => s + p.score, 0) / pagesWithScores.length).toFixed(1)
    : "0";

  return (
    <CmsV2Layout activeNav="seo" breadcrumbs={[{ label: "SEO" }]}>
      <div className="max-w-5xl mx-auto" data-testid="admin-cms-v2-seo-page">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-bold text-foreground">SEO Overview</h1>
          <Badge variant="outline" className="border-border text-muted-foreground text-xs">Preview</Badge>
        </div>

        {!isLoading && pagesWithScores.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{pagesWithScores.length}</p>
                <p className="text-xs text-muted-foreground">Pages Audited</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{avgScore}/3</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{pagesWithScores.filter((p: any) => p.score === 3).length}</p>
                <p className="text-xs text-muted-foreground">Fully Optimized</p>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : pagesWithScores.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center text-muted-foreground text-sm">No pages to audit.</CardContent>
          </Card>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-[11px] text-muted-foreground uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-medium">Page</th>
                  <th className="text-center px-4 py-2.5 font-medium">Title</th>
                  <th className="text-center px-4 py-2.5 font-medium">Description</th>
                  <th className="text-center px-4 py-2.5 font-medium">OG Tags</th>
                  <th className="text-center px-4 py-2.5 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {pagesWithScores.map((page: any) => (
                  <tr key={page.id} className="border-b border-border/30 hover:bg-card/40 transition-colors" data-testid={`card-seo-${page.id}`}>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm text-foreground font-medium">{page.title}</span>
                        <p className="text-[11px] text-muted-foreground font-mono">/{page.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {page.hasTitle
                        ? <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                        : <AlertCircle className="w-4 h-4 text-yellow-400 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {page.hasDesc
                        ? <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                        : <AlertCircle className="w-4 h-4 text-yellow-400 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {page.hasOg
                        ? <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                        : <AlertCircle className="w-4 h-4 text-yellow-400 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={page.score === 3 ? "border-green-800/60 text-green-400 text-xs" : page.score >= 1 ? "border-yellow-800/60 text-yellow-400 text-xs" : "border-red-800/60 text-red-400 text-xs"}
                      >
                        {page.score}/3
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CmsV2Layout>
  );
}
