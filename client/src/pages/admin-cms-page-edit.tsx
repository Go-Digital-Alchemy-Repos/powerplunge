import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAdmin } from "@/hooks/use-admin";
import CmsLayout from "@/components/admin/CmsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  ArrowLeft,
  Globe,
  GlobeLock,
  Blocks,
  Eye,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
} from "lucide-react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractBlockText(contentJson: any): string {
  if (!contentJson?.content) return "";
  const parts: string[] = [];
  for (const item of contentJson.content) {
    if (!item?.props) continue;
    const props = item.props;
    for (const val of Object.values(props)) {
      if (typeof val === "string" && val.trim()) {
        parts.push(val.replace(/<[^>]*>/g, " ").trim());
      }
      if (Array.isArray(val)) {
        for (const child of val) {
          if (typeof child === "object" && child) {
            for (const cv of Object.values(child)) {
              if (typeof cv === "string" && cv.trim()) {
                parts.push(cv.replace(/<[^>]*>/g, " ").trim());
              }
            }
          }
        }
      }
    }
  }
  return parts.filter(Boolean).join(" ").slice(0, 2000);
}

export default function AdminCmsPageEdit() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [, params] = useRoute("/admin/cms/pages/:id/edit");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const pageId = params?.id;

  const [seoOpen, setSeoOpen] = useState(false);
  const [generatingSeo, setGeneratingSeo] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [slugTouched, setSlugTouched] = useState(false);

  const { data: page, isLoading } = useQuery<any>({
    queryKey: [`/api/admin/cms/pages/${pageId}`],
    enabled: !!pageId && hasFullAccess,
  });

  useEffect(() => {
    if (page) {
      setSlugTouched(true);
      setFormData({
        title: page.title || "",
        slug: page.slug || "",
        content: page.content || "",
        status: page.status || "draft",
        showInNav: page.showInNav || false,
        navOrder: page.navOrder || 0,
        metaTitle: page.metaTitle || "",
        metaDescription: page.metaDescription || "",
        metaKeywords: page.metaKeywords || "",
        canonicalUrl: page.canonicalUrl || "",
        ogTitle: page.ogTitle || "",
        ogDescription: page.ogDescription || "",
        ogImage: page.ogImage || "",
        twitterCard: page.twitterCard || "summary_large_image",
        twitterTitle: page.twitterTitle || "",
        twitterDescription: page.twitterDescription || "",
        twitterImage: page.twitterImage || "",
        robots: page.robots || "index, follow",
        featuredImage: page.featuredImage || "",
      });
    }
  }, [page]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("PUT", `/api/admin/cms/pages/${pageId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/cms/pages/${pageId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      toast({ title: "Page saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (action: "publish" | "unpublish") => {
      const res = await apiRequest("POST", `/api/admin/cms/pages/${pageId}/${action}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/cms/pages/${pageId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/pages"] });
      setFormData((prev) => ({ ...prev, status: data.status }));
      toast({ title: data.status === "published" ? "Page published" : "Page unpublished" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate(formData);
  }

  function updateField(key: string, value: any) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleGenerateSeo() {
    if (!formData.title) {
      toast({ title: "Page title is required", description: "Add a title before generating SEO metadata.", variant: "destructive" });
      return;
    }
    setGeneratingSeo(true);
    try {
      const blockText = extractBlockText(page?.contentJson);
      const combinedContent = [formData.content || "", blockText].filter(Boolean).join(" ");
      const res = await apiRequest("POST", "/api/admin/cms/pages/generate-seo", {
        title: formData.title,
        content: combinedContent,
        pageType: page?.pageType || "page",
      });
      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        metaTitle: data.metaTitle || prev.metaTitle,
        metaDescription: data.metaDescription || prev.metaDescription,
        metaKeywords: data.metaKeywords || prev.metaKeywords,
        ogTitle: data.ogTitle || prev.ogTitle,
        ogDescription: data.ogDescription || prev.ogDescription,
      }));
      toast({ title: "SEO metadata generated", description: "Review the suggestions and save when ready." });
    } catch (err: any) {
      const msg = err?.message || "Failed to generate SEO metadata";
      toast({ title: "AI generation failed", description: msg, variant: "destructive" });
    } finally {
      setGeneratingSeo(false);
    }
  }

  if (adminLoading || !hasFullAccess) {
    return (
      <CmsLayout activeNav="pages" breadcrumbs={[{ label: "Pages", href: "/admin/cms/pages" }, { label: "Edit" }]}>
        <div className="p-8 text-center text-muted-foreground">
          {adminLoading ? "Loading..." : "Access Denied"}
        </div>
      </CmsLayout>
    );
  }

  if (isLoading) {
    return (
      <CmsLayout activeNav="pages" breadcrumbs={[{ label: "Pages", href: "/admin/cms/pages" }, { label: "Loading..." }]}>
        <div className="max-w-3xl mx-auto p-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-card/40 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </CmsLayout>
    );
  }

  if (!page) {
    return (
      <CmsLayout activeNav="pages" breadcrumbs={[{ label: "Pages", href: "/admin/cms/pages" }, { label: "Not Found" }]}>
        <div className="max-w-3xl mx-auto p-8 text-center">
          <p className="text-muted-foreground">Page not found.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate("/admin/cms/pages")}>
            Back to Pages
          </Button>
        </div>
      </CmsLayout>
    );
  }

  const isPublished = formData.status === "published";
  const hasBlocks = page.contentJson?.blocks?.length > 0;

  return (
    <CmsLayout activeNav="pages" breadcrumbs={[{ label: "Pages", href: "/admin/cms/pages" }, { label: page.title }]}>
      <div className="max-w-3xl mx-auto" data-testid="page-editor">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/cms/pages")}
              data-testid="button-back-pages"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Pages
            </Button>
            <Badge
              variant="outline"
              className={isPublished
                ? "border-green-800/60 text-green-400 text-[10px]"
                : "border-yellow-800/60 text-yellow-400 text-[10px]"}
            >
              {isPublished ? (
                <span className="flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> Published</span>
              ) : (
                <span className="flex items-center gap-1"><GlobeLock className="w-2.5 h-2.5" /> Draft</span>
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {isPublished && page.slug && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`/page/${page.slug}`, "_blank")}
                data-testid="button-view-live"
              >
                <Eye className="w-4 h-4 mr-1" />
                View Live
              </Button>
            )}
            {hasBlocks && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/cms/pages/${pageId}/builder`)}
                data-testid="button-open-builder"
              >
                <Blocks className="w-4 h-4 mr-1" />
                Page Builder
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => publishMutation.mutate(isPublished ? "unpublish" : "publish")}
              variant={isPublished ? "outline" : "default"}
              disabled={publishMutation.isPending}
              data-testid="button-toggle-publish"
            >
              {isPublished ? (
                <><GlobeLock className="w-4 h-4 mr-1" /> Unpublish</>
              ) : (
                <><Globe className="w-4 h-4 mr-1" /> Publish</>
              )}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-base">Page Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title || ""}
                  onChange={(e) => {
                    updateField("title", e.target.value);
                    if (!slugTouched) {
                      updateField("slug", slugify(e.target.value));
                    }
                  }}
                  placeholder="Page title"
                  data-testid="input-page-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/page/</span>
                  <Input
                    id="slug"
                    value={formData.slug || ""}
                    onChange={(e) => {
                      setSlugTouched(true);
                      updateField("slug", e.target.value);
                    }}
                    placeholder="page-slug"
                    className="flex-1"
                    data-testid="input-page-slug"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show in Navigation</Label>
                  <p className="text-xs text-muted-foreground">Display this page in the site navigation</p>
                </div>
                <Switch
                  checked={formData.showInNav || false}
                  onCheckedChange={(checked) => updateField("showInNav", checked)}
                  data-testid="switch-show-in-nav"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-base">Content</CardTitle>
              <CardDescription>
                {hasBlocks
                  ? "This page uses the block-based page builder for visual content. Use the Page Builder button above to edit blocks. The HTML field below is for supplemental content."
                  : "Enter your page content as HTML. For a visual editing experience, you can switch to the Page Builder."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.content || ""}
                onChange={(e) => updateField("content", e.target.value)}
                placeholder="Enter page content (HTML supported)..."
                className="min-h-[200px] font-mono text-sm"
                data-testid="textarea-page-content"
              />
              {!hasBlocks && (
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/cms/pages/${pageId}/builder`)}
                    data-testid="button-switch-to-builder"
                  >
                    <Blocks className="w-4 h-4 mr-1" />
                    Switch to Page Builder
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <button
                type="button"
                className="flex items-center justify-between w-full text-left"
                onClick={() => setSeoOpen(!seoOpen)}
                data-testid="button-toggle-seo"
              >
                <div>
                  <CardTitle className="text-foreground text-base flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    SEO Settings
                  </CardTitle>
                  <CardDescription>Search engine optimization and social sharing</CardDescription>
                </div>
                {seoOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {seoOpen && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={formData.metaTitle || ""}
                    onChange={(e) => updateField("metaTitle", e.target.value)}
                    placeholder="SEO title (defaults to page title)"
                    data-testid="input-meta-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription || ""}
                    onChange={(e) => updateField("metaDescription", e.target.value)}
                    placeholder="Brief description for search engines (150-160 chars recommended)"
                    className="min-h-[80px]"
                    data-testid="input-meta-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaKeywords">Meta Keywords</Label>
                  <Input
                    id="metaKeywords"
                    value={formData.metaKeywords || ""}
                    onChange={(e) => updateField("metaKeywords", e.target.value)}
                    placeholder="Comma-separated keywords"
                    data-testid="input-meta-keywords"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="canonicalUrl">Canonical URL</Label>
                  <Input
                    id="canonicalUrl"
                    value={formData.canonicalUrl || ""}
                    onChange={(e) => updateField("canonicalUrl", e.target.value)}
                    placeholder="https://..."
                    data-testid="input-canonical-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="robots">Robots</Label>
                  <Select
                    value={formData.robots || "index, follow"}
                    onValueChange={(val) => updateField("robots", val)}
                  >
                    <SelectTrigger data-testid="select-robots">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="index, follow">Index, Follow</SelectItem>
                      <SelectItem value="noindex, follow">No Index, Follow</SelectItem>
                      <SelectItem value="index, nofollow">Index, No Follow</SelectItem>
                      <SelectItem value="noindex, nofollow">No Index, No Follow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="featuredImage">Featured Image URL</Label>
                  <Input
                    id="featuredImage"
                    value={formData.featuredImage || ""}
                    onChange={(e) => updateField("featuredImage", e.target.value)}
                    placeholder="https://..."
                    data-testid="input-featured-image"
                  />
                </div>

                <div className="border-t border-border pt-4 mt-4">
                  <p className="text-sm font-medium text-foreground mb-3">Open Graph (Social Sharing)</p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="ogTitle">OG Title</Label>
                      <Input
                        id="ogTitle"
                        value={formData.ogTitle || ""}
                        onChange={(e) => updateField("ogTitle", e.target.value)}
                        placeholder="Defaults to meta title"
                        data-testid="input-og-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ogDescription">OG Description</Label>
                      <Input
                        id="ogDescription"
                        value={formData.ogDescription || ""}
                        onChange={(e) => updateField("ogDescription", e.target.value)}
                        placeholder="Defaults to meta description"
                        data-testid="input-og-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ogImage">OG Image URL</Label>
                      <Input
                        id="ogImage"
                        value={formData.ogImage || ""}
                        onChange={(e) => updateField("ogImage", e.target.value)}
                        placeholder="https://..."
                        data-testid="input-og-image"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4 mt-4">
                  <p className="text-sm font-medium text-foreground mb-3">Twitter Card</p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="twitterCard">Card Type</Label>
                      <Select
                        value={formData.twitterCard || "summary_large_image"}
                        onValueChange={(val) => updateField("twitterCard", val)}
                      >
                        <SelectTrigger data-testid="select-twitter-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="summary">Summary</SelectItem>
                          <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitterTitle">Twitter Title</Label>
                      <Input
                        id="twitterTitle"
                        value={formData.twitterTitle || ""}
                        onChange={(e) => updateField("twitterTitle", e.target.value)}
                        placeholder="Defaults to OG title"
                        data-testid="input-twitter-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitterDescription">Twitter Description</Label>
                      <Input
                        id="twitterDescription"
                        value={formData.twitterDescription || ""}
                        onChange={(e) => updateField("twitterDescription", e.target.value)}
                        placeholder="Defaults to OG description"
                        data-testid="input-twitter-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitterImage">Twitter Image URL</Label>
                      <Input
                        id="twitterImage"
                        value={formData.twitterImage || ""}
                        onChange={(e) => updateField("twitterImage", e.target.value)}
                        placeholder="Defaults to OG image"
                        data-testid="input-twitter-image"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={saveMutation.isPending}
              data-testid="button-save-page"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? "Saving..." : "Save Page"}
            </Button>
          </div>
        </form>
      </div>
    </CmsLayout>
  );
}
