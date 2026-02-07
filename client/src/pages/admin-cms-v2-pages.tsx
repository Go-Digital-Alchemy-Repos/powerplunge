import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import CmsV2Layout from "@/components/admin/CmsV2Layout";
import { FileText, Home, ShoppingBag, Plus, Globe, GlobeLock, MoreHorizontal, Pencil, Eye, ArrowRightLeft, Search, Filter, Sparkles, Layers } from "lucide-react";
import { CMS_TEMPLATES, templateToContentJson, type CmsTemplate } from "@/cms/templates/templateLibrary";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminCmsV2Pages() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newPageType, setNewPageType] = useState("page");
  const [slugTouched, setSlugTouched] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const { data: pages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/cms-v2/pages"],
    enabled: hasFullAccess,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; slug: string; pageType: string; templateId: string }) => {
      const template = CMS_TEMPLATES.find((t) => t.id === data.templateId);
      const contentJson = template ? templateToContentJson(template) : { version: 1, blocks: [] };
      const res = await apiRequest("POST", "/api/admin/cms-v2/pages", {
        title: data.title,
        slug: data.slug,
        pageType: data.pageType,
        status: "draft",
        contentJson,
      });
      return res.json();
    },
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/pages"] });
      toast({ title: "Page created", description: `"${page.title}" is ready to edit.` });
      setCreateOpen(false);
      resetForm();
      navigate(`/admin/cms-v2/pages/${page.id}/builder`);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create page", description: err.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "publish" | "unpublish" }) => {
      const res = await apiRequest("POST", `/api/admin/cms-v2/pages/${id}/${action}`);
      return res.json();
    },
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/pages"] });
      const verb = page.status === "published" ? "Published" : "Unpublished";
      toast({ title: verb, description: `"${page.title}" is now ${page.status}.` });
    },
    onError: (err: Error) => {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    },
  });

  const migrateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/cms-v2/pages/${id}/migrate-to-blocks`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/pages"] });
      toast({ title: "Migration complete", description: data.message || "Legacy HTML converted to blocks." });
    },
    onError: (err: Error) => {
      toast({ title: "Migration failed", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setNewTitle("");
    setNewSlug("");
    setNewPageType("page");
    setSlugTouched(false);
    setSelectedTemplate("blank");
  }

  function handleTitleChange(val: string) {
    setNewTitle(val);
    if (!slugTouched) {
      setNewSlug(slugify(val));
    }
  }

  function handleCreate() {
    if (!newTitle.trim() || !newSlug.trim()) return;
    createMutation.mutate({ title: newTitle.trim(), slug: newSlug.trim(), pageType: newPageType, templateId: selectedTemplate });
  }

  if (adminLoading || !hasFullAccess) {
    return (
      <CmsV2Layout activeNav="pages" breadcrumbs={[{ label: "Pages" }]}>
        <div className="p-8 text-center text-gray-400">
          {adminLoading ? "Loading..." : "Access Denied"}
        </div>
      </CmsV2Layout>
    );
  }

  const filteredPages = (pages || []).filter((page: any) => {
    if (statusFilter !== "all" && page.status !== statusFilter) return false;
    if (searchTerm && !page.title.toLowerCase().includes(searchTerm.toLowerCase()) && !page.slug.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const publishedCount = pages?.filter((p: any) => p.status === "published").length ?? 0;
  const draftCount = pages?.filter((p: any) => p.status === "draft").length ?? 0;

  return (
    <CmsV2Layout activeNav="pages" breadcrumbs={[{ label: "Pages" }]}>
      <div className="max-w-5xl mx-auto" data-testid="admin-cms-v2-pages-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Pages
              {!isLoading && pages && (
                <span className="text-sm font-normal text-gray-500">{pages.length} total</span>
              )}
            </h1>
          </div>
          <Button
            onClick={() => { resetForm(); setCreateOpen(true); }}
            className="bg-cyan-600 hover:bg-cyan-700 text-white h-8 text-xs"
            data-testid="button-create-page"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Page
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by title or slug..."
              className="h-8 pl-8 bg-gray-900/60 border-gray-800 text-sm text-white placeholder:text-gray-600"
              data-testid="input-search-pages"
            />
          </div>
          <div className="flex items-center gap-1">
            {(["all", "published", "draft"] as const).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={statusFilter === status ? "default" : "ghost"}
                className={statusFilter === status
                  ? "bg-gray-800 text-white h-8 text-xs"
                  : "text-gray-500 hover:text-white h-8 text-xs"}
                onClick={() => setStatusFilter(status)}
                data-testid={`filter-${status}`}
              >
                {status === "all" ? "All" : status === "published" ? `Published (${publishedCount})` : `Drafts (${draftCount})`}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-900/40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredPages.length === 0 ? (
          <Card className="bg-gray-900/60 border-gray-800/60">
            <CardContent className="p-10 text-center">
              <FileText className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 text-sm mb-4">
                {pages && pages.length > 0 ? "No pages match your filters." : "No pages yet. Create your first page to get started."}
              </p>
              {(!pages || pages.length === 0) && (
                <Button
                  onClick={() => { resetForm(); setCreateOpen(true); }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                  data-testid="button-create-first-page"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Create First Page
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="border border-gray-800/60 rounded-lg overflow-hidden" data-testid="pages-table">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800/60 text-[11px] text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-medium">Title</th>
                  <th className="text-left px-4 py-2.5 font-medium">Slug</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium">Updated</th>
                  <th className="text-left px-4 py-2.5 font-medium">Flags</th>
                  <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPages.map((page: any) => (
                  <tr key={page.id} className="border-b border-gray-800/30 hover:bg-gray-900/40 transition-colors" data-testid={`row-page-${page.id}`}>
                    <td className="px-4 py-3">
                      <span className="text-sm text-white font-medium" data-testid={`text-page-title-${page.id}`}>{page.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 font-mono">/{page.slug}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={page.status === "published"
                          ? "border-green-800/60 text-green-400 text-[10px]"
                          : "border-yellow-800/60 text-yellow-400 text-[10px]"}
                        data-testid={`badge-status-${page.id}`}
                      >
                        {page.status === "published" ? (
                          <span className="flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> Published</span>
                        ) : (
                          <span className="flex items-center gap-1"><GlobeLock className="w-2.5 h-2.5" /> Draft</span>
                        )}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{formatDate(page.updatedAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {page.isHome && (
                          <Badge className="bg-cyan-900/30 text-cyan-400 border-none text-[10px] gap-0.5 px-1.5" data-testid={`badge-home-${page.id}`}>
                            <Home className="w-2.5 h-2.5" /> Home
                          </Badge>
                        )}
                        {page.isShop && (
                          <Badge className="bg-purple-900/30 text-purple-300 border-none text-[10px] gap-0.5 px-1.5" data-testid={`badge-shop-${page.id}`}>
                            <ShoppingBag className="w-2.5 h-2.5" /> Shop
                          </Badge>
                        )}
                        {page.showInNav && (
                          <Badge variant="outline" className="border-gray-700 text-gray-500 text-[10px] px-1.5">Nav</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/cms-v2/pages/${page.id}/builder`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20 h-7 text-xs gap-1"
                            data-testid={`button-edit-${page.id}`}
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gray-500 hover:text-white h-7 w-7 p-0"
                              data-testid={`button-actions-${page.id}`}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 text-white">
                            <DropdownMenuItem
                              className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800 text-xs"
                              onClick={() => navigate(`/admin/cms-v2/pages/${page.id}/builder`)}
                              data-testid={`action-open-builder-${page.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5 mr-2" />
                              Open Builder
                            </DropdownMenuItem>
                            {page.status === "published" && page.slug && (
                              <DropdownMenuItem
                                className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800 text-xs"
                                onClick={() => window.open(`/page/${page.slug}`, "_blank")}
                                data-testid={`action-preview-${page.id}`}
                              >
                                <Eye className="w-3.5 h-3.5 mr-2" />
                                View Live
                              </DropdownMenuItem>
                            )}
                            {page.content && page.content.trim() && !(page.contentJson?.blocks?.length > 0) && (
                              <>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                <DropdownMenuItem
                                  className="cursor-pointer text-cyan-400 hover:bg-gray-800 focus:bg-gray-800 focus:text-cyan-400 text-xs"
                                  onClick={() => migrateMutation.mutate(page.id)}
                                  disabled={migrateMutation.isPending}
                                  data-testid={`action-migrate-${page.id}`}
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5 mr-2" />
                                  {migrateMutation.isPending ? "Migrating..." : "Migrate to Blocks"}
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator className="bg-gray-700" />
                            {page.status === "draft" ? (
                              <DropdownMenuItem
                                className="cursor-pointer text-green-400 hover:bg-gray-800 focus:bg-gray-800 focus:text-green-400 text-xs"
                                onClick={() => publishMutation.mutate({ id: page.id, action: "publish" })}
                                data-testid={`action-publish-${page.id}`}
                              >
                                <Globe className="w-3.5 h-3.5 mr-2" />
                                Publish
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="cursor-pointer text-yellow-400 hover:bg-gray-800 focus:bg-gray-800 focus:text-yellow-400 text-xs"
                                onClick={() => publishMutation.mutate({ id: page.id, action: "unpublish" })}
                                data-testid={`action-unpublish-${page.id}`}
                              >
                                <GlobeLock className="w-3.5 h-3.5 mr-2" />
                                Unpublish
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white sm:max-w-lg" data-testid="dialog-create-page">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Page</DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose a template and configure your new page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Template</Label>
              <div className="grid grid-cols-2 gap-2" data-testid="template-selector">
                {CMS_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`text-left rounded-lg border p-3 transition-all ${
                      selectedTemplate === tmpl.id
                        ? "border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/30"
                        : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                    }`}
                    data-testid={`template-option-${tmpl.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {tmpl.id === "blank" ? (
                        <FileText className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                      )}
                      <span className="text-xs font-medium text-white">{tmpl.name}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed">{tmpl.description}</p>
                    {tmpl.blocks.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Layers className="w-3 h-3 text-gray-600" />
                        <span className="text-[10px] text-gray-600">{tmpl.blocks.length} blocks</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-title" className="text-gray-300 text-sm">Title</Label>
              <Input
                id="page-title"
                value={newTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="My New Page"
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                data-testid="input-page-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-slug" className="text-gray-300 text-sm">URL Slug</Label>
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-sm">/</span>
                <Input
                  id="page-slug"
                  value={newSlug}
                  onChange={(e) => { setSlugTouched(true); setNewSlug(slugify(e.target.value)); }}
                  placeholder="my-new-page"
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                  data-testid="input-page-slug"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Page Type</Label>
              <Select value={newPageType} onValueChange={setNewPageType}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="select-page-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600 text-white">
                  <SelectItem value="page">Standard Page</SelectItem>
                  <SelectItem value="landing">Landing Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              className="text-gray-400 hover:text-white"
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || !newSlug.trim() || createMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
              data-testid="button-confirm-create"
            >
              {createMutation.isPending ? "Creating..." : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CmsV2Layout>
  );
}
