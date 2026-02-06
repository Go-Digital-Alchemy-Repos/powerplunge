import { useAdmin } from "@/hooks/use-admin";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminNav from "@/components/admin/AdminNav";
import { Search, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminCmsV2Seo() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();

  const { data: pages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/cms-v2/pages"],
    enabled: hasFullAccess,
  });

  if (adminLoading || !hasFullAccess) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <AdminNav currentPage="cms-v2" />
        <div className="p-8 text-center text-gray-400">
          {adminLoading ? "Loading..." : "Access Denied"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white" data-testid="admin-cms-v2-seo-page">
      <AdminNav currentPage="cms-v2" />

      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/cms-v2">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" data-testid="link-back-dashboard">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Search className="w-7 h-7 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">SEO Overview</h1>
          <Badge variant="outline" className="border-cyan-700 text-cyan-400 text-xs">Preview</Badge>
        </div>

        {isLoading ? (
          <p className="text-gray-400">Loading...</p>
        ) : !pages || pages.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8 text-center text-gray-400">
              No pages to audit.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pages.map((page: any) => {
              const hasTitle = !!page.metaTitle;
              const hasDesc = !!page.metaDescription;
              const hasOg = !!page.ogTitle || !!page.ogImage;
              const score = [hasTitle, hasDesc, hasOg].filter(Boolean).length;

              return (
                <Card key={page.id} className="bg-gray-900 border-gray-800" data-testid={`card-seo-${page.id}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">{page.title}</span>
                      <p className="text-xs text-gray-500 mt-0.5">/{page.slug}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        {hasTitle ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                        )}
                        <span className={hasTitle ? "text-green-400" : "text-yellow-400"}>Title</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {hasDesc ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                        )}
                        <span className={hasDesc ? "text-green-400" : "text-yellow-400"}>Description</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {hasOg ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
                        )}
                        <span className={hasOg ? "text-green-400" : "text-yellow-400"}>OG</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={score === 3 ? "border-green-700 text-green-400" : score >= 1 ? "border-yellow-700 text-yellow-400" : "border-red-700 text-red-400"}
                      >
                        {score}/3
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
