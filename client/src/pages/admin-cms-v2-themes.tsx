import { useAdmin } from "@/hooks/use-admin";
import { Link } from "wouter";
import AdminNav from "@/components/admin/AdminNav";
import { Palette, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminCmsV2Themes() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();

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
    <div className="min-h-screen bg-gray-950 text-white" data-testid="admin-cms-v2-themes-page">
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
          <Palette className="w-7 h-7 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">Themes</h1>
          <Badge variant="outline" className="border-cyan-700 text-cyan-400 text-xs">Preview</Badge>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center text-gray-400" data-testid="text-themes-placeholder">
            Theme settings — colors, fonts, and spacing — will be managed here.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
