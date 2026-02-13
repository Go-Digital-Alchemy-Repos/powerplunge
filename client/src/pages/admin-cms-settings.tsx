import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import CmsLayout from "@/components/admin/CmsLayout";
import { Settings, Home, Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CmsPage {
  id: string;
  title: string;
  slug: string;
  status: string;
  isHome: boolean;
  isShop: boolean;
  pageType: string;
}

export default function AdminCmsSettings() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pages = [], isLoading: pagesLoading } = useQuery<CmsPage[]>({
    queryKey: ["/api/admin/cms/pages"],
    enabled: hasFullAccess,
  });

  const currentHomePage = pages.find((p) => p.isHome);
  const [selectedHomePageId, setSelectedHomePageId] = useState<string | null>(null);
  const resolvedSelection = selectedHomePageId ?? currentHomePage?.id ?? "";
  const hasUnsavedChanges = selectedHomePageId !== null && selectedHomePageId !== (currentHomePage?.id ?? "");

  const setHomeMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const res = await apiRequest("POST", `/api/admin/cms/pages/${pageId}/set-home`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pages/home"] });
      setSelectedHomePageId(null);
      toast({
        title: "Home page updated",
        description: "Your site's home page has been changed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (resolvedSelection) {
      setHomeMutation.mutate(resolvedSelection);
    }
  };

  if (adminLoading || !hasFullAccess) {
    return (
      <CmsLayout activeNav="settings" breadcrumbs={[{ label: "Settings" }]}>
        <div className="p-8 text-center text-muted-foreground">
          {adminLoading ? "Loading..." : "Access Denied"}
        </div>
      </CmsLayout>
    );
  }

  const selectedPage = pages.find((p) => p.id === resolvedSelection);

  return (
    <CmsLayout activeNav="settings" breadcrumbs={[{ label: "Settings" }]}>
      <div className="max-w-3xl mx-auto" data-testid="admin-cms-settings-page">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">CMS Settings</h1>
        </div>

        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-5">
                <Home className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground mb-1">Home Page</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose which CMS page serves as your site's main landing page. Visitors arriving at your root URL will see this page.
                  </p>
                </div>
              </div>

              {currentHomePage && (
                <div className="mb-5 p-3 rounded-lg bg-muted border border-border flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/80">
                      Current home page: <span className="font-medium text-foreground">{currentHomePage.title}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">/{currentHomePage.slug}</p>
                  </div>
                  <Badge
                    className={
                      currentHomePage.status === "published"
                        ? "bg-emerald-900/30 text-emerald-400 border-none text-xs"
                        : "bg-amber-900/30 text-amber-400 border-none text-xs"
                    }
                  >
                    {currentHomePage.status}
                  </Badge>
                </div>
              )}

              {!currentHomePage && !pagesLoading && (
                <div className="mb-5 p-3 rounded-lg bg-amber-900/20 border border-amber-800/40 flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-300">
                    No home page is currently set. Select one below and save.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2" htmlFor="home-page-select">
                    Select Home Page
                  </label>
                  <Select
                    value={resolvedSelection}
                    onValueChange={(val) => setSelectedHomePageId(val)}
                    disabled={pagesLoading}
                  >
                    <SelectTrigger
                      className="bg-muted border-border text-foreground w-full"
                      id="home-page-select"
                      data-testid="select-home-page"
                    >
                      <SelectValue placeholder={pagesLoading ? "Loading pages..." : "Choose a page"} />
                    </SelectTrigger>
                    <SelectContent>
                      {pages.map((page) => (
                        <SelectItem
                          key={page.id}
                          value={page.id}
                          data-testid={`option-page-${page.id}`}
                        >
                          <span className="flex items-center gap-2">
                            {page.title}
                            <span className="text-muted-foreground text-xs">/{page.slug}</span>
                            {page.isHome && (
                              <Badge className="bg-primary/10 text-primary border-none text-[10px] px-1.5 py-0">
                                current
                              </Badge>
                            )}
                            {page.status === "draft" && (
                              <Badge className="bg-amber-900/30 text-amber-400 border-none text-[10px] px-1.5 py-0">
                                draft
                              </Badge>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPage && selectedPage.status === "draft" && hasUnsavedChanges && (
                  <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-800/40 flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-300">
                      This page is currently a draft. You may want to publish it so visitors can see it.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || setHomeMutation.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                    data-testid="button-save-home-page"
                  >
                    {setHomeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </Button>
                  {hasUnsavedChanges && (
                    <span className="text-xs text-amber-400">You have unsaved changes</span>
                  )}
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
    </CmsLayout>
  );
}
