import { useAdmin } from "@/hooks/use-admin";
import CmsV2Layout from "@/components/admin/CmsV2Layout";
import { Settings, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminCmsV2Settings() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();

  if (adminLoading || !hasFullAccess) {
    return (
      <CmsV2Layout activeNav="settings" breadcrumbs={[{ label: "Settings" }]}>
        <div className="p-8 text-center text-muted-foreground">
          {adminLoading ? "Loading..." : "Access Denied"}
        </div>
      </CmsV2Layout>
    );
  }

  return (
    <CmsV2Layout activeNav="settings" breadcrumbs={[{ label: "Settings" }]}>
      <div className="max-w-3xl mx-auto" data-testid="admin-cms-v2-settings-page">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">CMS v2 Settings</h1>
          <Badge variant="outline" className="border-primary/30 text-primary text-xs">Preview</Badge>
        </div>

        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Feature Flag Status</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    CMS v2 is controlled by the <code className="text-primary bg-muted px-1 py-0.5 rounded text-[11px]">CMS_V2_ENABLED</code> environment variable.
                    When disabled, all CMS v2 features are hidden from the admin navigation.
                  </p>
                  <Badge className="bg-primary/10 text-primary border-primary/30 text-xs" data-testid="badge-cms-v2-status">
                    CMS v2 is active in this session
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <h3 className="text-sm font-medium text-foreground mb-1">Theme Token System</h3>
              <p className="text-xs text-muted-foreground mb-2">
                The new theme token system provides granular control over colors, typography, spacing, and layout.
                Theme tokens are applied as CSS custom properties and can be previewed before activating.
              </p>
              <p className="text-xs text-muted-foreground/60">
                10 built-in presets available. Custom theme editing coming in a future release.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <h3 className="text-sm font-medium text-foreground mb-1">Block Registry</h3>
              <p className="text-xs text-muted-foreground">
                12 content blocks registered. Blocks are available in the page builder and render on public pages via the PageRenderer.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </CmsV2Layout>
  );
}
