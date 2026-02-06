import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AdminNav from "@/components/admin/AdminNav";
import { FileText, ArrowLeft, Home, ShoppingBag, Plus, Globe, GlobeLock, MoreHorizontal, Pencil, Eye, ArrowRightLeft } from "lucide-react";
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

  const { data: pages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/cms-v2/pages"],
    enabled: hasFullAccess,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; slug: string; pageType: string }) => {
      const res = await apiRequest("POST", "/api/admin/cms-v2/pages", {
        title: data.title,
        slug: data.slug,
        pageType: data.pageType,
        status: "draft",
        contentJson: { version: 1, blocks: [] },
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
      toast({ title: `${verb}`, description: `"${page.title}" is now ${page.status}.` });
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
  }

  function handleTitleChange(val: string) {
    setNewTitle(val);
    if (!slugTouched) {
      setNewSlug(slugify(val));
    }
  }

  function handleCreate() {
    if (!newTitle.trim() || !newSlug.trim()) return;
    createMutation.mutate({ title: newTitle.trim(), slug: newSlug.trim(), pageType: newPageType });
  }

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

  const publishedCount = pages?.filter((p: any) => p.status === "published").length ?? 0;
  const draftCount = pages?.filter((p: any) => p.status === "draft").length ?? 0;

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

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-7 h-7 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">Pages</h1>
            {!isLoading && pages && (
              <div className="flex items-center gap-2 ml-2">
                <Badge variant="outline" className="border-gray-700 text-gray-400 text-xs">
                  {pages.length} total
                </Badge>
                <Badge variant="outline" className="border-green-800 text-green-400 text-xs">
                  {publishedCount} published
                </Badge>
                {draftCount > 0 && (
                  <Badge variant="outline" className="border-yellow-800 text-yellow-400 text-xs">
                    {draftCount} draft
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Button
            onClick={() => { resetForm(); setCreateOpen(true); }}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
            data-testid="button-create-page"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Page
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-gray-900 border-gray-800 animate-pulse">
                <CardContent className="p-4 h-16" />
              </Card>
            ))}
          </div>
        ) : !pages || pages.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">No pages yet. Create your first page to get started.</p>
              <Button
                onClick={() => { resetForm(); setCreateOpen(true); }}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                data-testid="button-create-first-page"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create First Page
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pages.map((page: any) => (
              <Card key={page.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors" data-testid={`card-page-${page.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white truncate" data-testid={`text-page-title-${page.id}`}>
                          {page.title}
                        </span>
                        {page.isHome && (
                          <Badge className="bg-cyan-900/40 text-cyan-300 border-none text-xs gap-1" data-testid={`badge-home-${page.id}`}>
                            <Home className="w-3 h-3" /> Home
                          </Badge>
                        )}
                        {page.isShop && (
                          <Badge className="bg-purple-900/40 text-purple-300 border-none text-xs gap-1" data-testid={`badge-shop-${page.id}`}>
                            <ShoppingBag className="w-3 h-3" /> Shop
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="text-xs border-gray-700 text-gray-500"
                        >
                          {page.pageType}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">/{page.slug}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant="outline"
                      className={page.status === "published"
                        ? "border-green-700 text-green-400"
                        : "border-yellow-700 text-yellow-400"}
                      data-testid={`badge-status-${page.id}`}
                    >
                      {page.status === "published" ? (
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Published</span>
                      ) : (
                        <span className="flex items-center gap-1"><GlobeLock className="w-3 h-3" /> Draft</span>
                      )}
                    </Badge>

                    <Link href={`/admin/cms-v2/pages/${page.id}/builder`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-cyan-700 text-cyan-400 hover:bg-cyan-900/30"
                        data-testid={`button-edit-${page.id}`}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white h-8 w-8 p-0"
                          data-testid={`button-actions-${page.id}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 text-white">
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
                          onClick={() => navigate(`/admin/cms-v2/pages/${page.id}/builder`)}
                          data-testid={`action-open-builder-${page.id}`}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Open Builder
                        </DropdownMenuItem>
                        {page.status === "published" && page.slug && (
                          <>
                            <DropdownMenuItem
                              className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
                              onClick={() => window.open(`/page/${page.slug}`, "_blank")}
                              data-testid={`action-preview-${page.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Live Page
                            </DropdownMenuItem>
                          </>
                        )}
                        {page.content && page.content.trim() && (
                          !(page.contentJson?.blocks?.length > 0) ? (
                            <>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem
                                className="cursor-pointer text-cyan-400 hover:bg-gray-800 focus:bg-gray-800 focus:text-cyan-400"
                                onClick={() => migrateMutation.mutate(page.id)}
                                disabled={migrateMutation.isPending}
                                data-testid={`action-migrate-${page.id}`}
                              >
                                <ArrowRightLeft className="w-4 h-4 mr-2" />
                                {migrateMutation.isPending ? "Migrating..." : "Migrate to Blocks"}
                              </DropdownMenuItem>
                            </>
                          ) : null
                        )}
                        <DropdownMenuSeparator className="bg-gray-700" />
                        {page.status === "draft" ? (
                          <DropdownMenuItem
                            className="cursor-pointer text-green-400 hover:bg-gray-800 focus:bg-gray-800 focus:text-green-400"
                            onClick={() => publishMutation.mutate({ id: page.id, action: "publish" })}
                            data-testid={`action-publish-${page.id}`}
                          >
                            <Globe className="w-4 h-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="cursor-pointer text-yellow-400 hover:bg-gray-800 focus:bg-gray-800 focus:text-yellow-400"
                            onClick={() => publishMutation.mutate({ id: page.id, action: "unpublish" })}
                            data-testid={`action-unpublish-${page.id}`}
                          >
                            <GlobeLock className="w-4 h-4 mr-2" />
                            Unpublish
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white" data-testid="dialog-create-page">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Page</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a new page to your site. You can edit the content in the builder after creating it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="page-title" className="text-gray-300">Title</Label>
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
              <Label htmlFor="page-slug" className="text-gray-300">URL Slug</Label>
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
              <Label className="text-gray-300">Page Type</Label>
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
    </div>
  );
}
