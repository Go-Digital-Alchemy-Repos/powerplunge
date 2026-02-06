import { useAdmin } from "@/hooks/use-admin";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminNav from "@/components/admin/AdminNav";
import { FileText, ArrowLeft, Home, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminCmsV2Pages() {
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
    <div className="min-h-screen bg-gray-950 text-white" data-testid="admin-cms-v2-pages-page">
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
          <FileText className="w-7 h-7 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">Pages</h1>
          <Badge variant="outline" className="border-cyan-700 text-cyan-400 text-xs">Preview</Badge>
        </div>

        {isLoading ? (
          <p className="text-gray-400">Loading pages...</p>
        ) : !pages || pages.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8 text-center text-gray-400">
              No pages found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pages.map((page: any) => (
              <Card key={page.id} className="bg-gray-900 border-gray-800" data-testid={`card-page-${page.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white" data-testid={`text-page-title-${page.id}`}>{page.title}</span>
                        {page.isHome && (
                          <Badge className="bg-cyan-900/40 text-cyan-300 border-none text-xs gap-1">
                            <Home className="w-3 h-3" /> Home
                          </Badge>
                        )}
                        {page.isShop && (
                          <Badge className="bg-purple-900/40 text-purple-300 border-none text-xs gap-1">
                            <ShoppingBag className="w-3 h-3" /> Shop
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">/{page.slug}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={page.status === "published"
                      ? "border-green-700 text-green-400"
                      : "border-yellow-700 text-yellow-400"}
                    data-testid={`badge-status-${page.id}`}
                  >
                    {page.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
