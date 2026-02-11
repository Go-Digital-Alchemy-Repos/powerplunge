import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Edit, Trash2, FileText, Eye, GripVertical, Home, ShoppingBag, Pencil, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import AdminNav from "@/components/admin/AdminNav";
import { useAdmin } from "@/hooks/use-admin";

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  contentJson: any | null;
  pageType: string | null;
  template: string | null;
  isHome: boolean;
  isShop: boolean;
  featuredImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: string;
  showInNav: boolean;
  navOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPages() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [importMode, setImportMode] = useState<'create' | 'update'>('create');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    metaTitle: "",
    metaDescription: "",
    status: "draft",
    showInNav: false,
    navOrder: 0,
  });

  const { data: pages = [], isLoading } = useQuery<Page[]>({
    queryKey: ["/api/admin/pages"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create page");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Page created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pages"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create page", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update page");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Page updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pages"] });
      setIsDialogOpen(false);
      setEditingPage(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update page", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete page");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Page deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pages"] });
    },
    onError: () => {
      toast({ title: "Failed to delete page", variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async ({ exportData, mode }: { exportData: any; mode: 'create' | 'update' }) => {
      const res = await fetch("/api/admin/pages/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ exportData, mode }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to import page");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: data.action === 'created' ? "Page imported successfully!" : "Page updated successfully!",
        description: `"${data.page.title}" has been ${data.action}.`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pages"] });
      setIsImportDialogOpen(false);
      setImportData(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to import page", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = async (pageId: string) => {
    try {
      const res = await fetch(`/api/admin/pages/${pageId}/export`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to export page");
      
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `page-export-${Date.now()}.json`;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: "Page exported successfully!" });
    } catch (error) {
      toast({ title: "Failed to export page", variant: "destructive" });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.page) {
          toast({ title: "Invalid import file", description: "File must be a valid page export.", variant: "destructive" });
          return;
        }
        setImportData(data);
        setIsImportDialogOpen(true);
      } catch (error) {
        toast({ title: "Invalid JSON file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = () => {
    if (!importData) return;
    importMutation.mutate({ exportData: importData, mode: importMode });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      content: "",
      metaTitle: "",
      metaDescription: "",
      status: "draft",
      showInNav: false,
      navOrder: 0,
    });
  };

  const openEditDialog = (page: Page) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content || "",
      metaTitle: page.metaTitle || "",
      metaDescription: page.metaDescription || "",
      status: page.status,
      showInNav: page.showInNav || false,
      navOrder: page.navOrder || 0,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    };

    if (editingPage) {
      updateMutation.mutate({ id: editingPage.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access pages. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <AdminNav currentPage="pages" role={role} />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Pages</h2>
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              className="hidden"
              data-testid="input-import-file"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="button-import">
              <Upload className="w-4 h-4 mr-2" /> Import Page
            </Button>
            <Button onClick={() => navigate("/admin/pages/new")} data-testid="button-create">
              <Plus className="w-4 h-4 mr-2" /> Create Page
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : pages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No pages created yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                Create Your First Page
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pages.map((page) => (
              <Card key={page.id} data-testid={`page-${page.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-lg">{page.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded ${page.status === "published" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                            {page.status}
                          </span>
                          {page.isHome && (
                            <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary flex items-center gap-1">
                              <Home className="w-3 h-3" /> Home
                            </span>
                          )}
                          {page.isShop && (
                            <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400 flex items-center gap-1">
                              <ShoppingBag className="w-3 h-3" /> Shop
                            </span>
                          )}
                          {page.showInNav && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                              In Nav
                            </span>
                          )}
                          {page.contentJson?.blocks?.length > 0 && (
                            <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                              {page.contentJson.blocks.length} blocks
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm">/{page.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {page.status === "published" && (
                        <Button variant="ghost" size="sm" onClick={() => window.open(`/page/${page.slug}`, "_blank")} data-testid={`view-${page.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/pages/${page.id}/edit`)} className="text-primary hover:text-primary/80" data-testid={`edit-builder-${page.id}`}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(page)} data-testid={`edit-${page.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleExport(page.id)} data-testid={`export-${page.id}`} title="Export as JSON">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => deleteMutation.mutate(page.id)} data-testid={`delete-${page.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPage ? "Edit Page" : "Create Page"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Page Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        title: e.target.value,
                        slug: !editingPage ? generateSlug(e.target.value) : formData.slug,
                      });
                    }}
                    placeholder="About Us"
                    data-testid="input-title"
                  />
                </div>
                <div>
                  <Label>URL Slug</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="about-us"
                    data-testid="input-slug"
                  />
                </div>
              </div>

              <div>
                <Label>Content (HTML supported)</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="<h1>About Us</h1><p>Write your page content here...</p>"
                  className="min-h-[200px] font-mono text-sm"
                  data-testid="input-content"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Meta Title (SEO)</Label>
                  <Input
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                    placeholder="About Us | Power Plunge"
                    data-testid="input-meta-title"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Meta Description (SEO)</Label>
                <Textarea
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  placeholder="Learn more about Power Plunge and our mission..."
                  data-testid="input-meta-description"
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.showInNav}
                    onCheckedChange={(checked) => setFormData({ ...formData, showInNav: checked })}
                    data-testid="switch-nav"
                  />
                  <Label>Show in Navigation</Label>
                </div>
                {formData.showInNav && (
                  <div className="flex items-center gap-2">
                    <Label>Nav Order:</Label>
                    <Input
                      type="number"
                      value={formData.navOrder}
                      onChange={(e) => setFormData({ ...formData, navOrder: parseInt(e.target.value) || 0 })}
                      className="w-20"
                      data-testid="input-nav-order"
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!formData.title} data-testid="button-save">
                {editingPage ? "Update Page" : "Create Page"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Import Page</DialogTitle>
            </DialogHeader>
            {importData && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Page Details</h4>
                  <p><span className="text-muted-foreground">Title:</span> {importData.page.title}</p>
                  <p><span className="text-muted-foreground">Slug:</span> /{importData.page.slug}</p>
                  <p><span className="text-muted-foreground">Type:</span> {importData.page.pageType || 'page'}</p>
                  {importData.page.contentJson?.blocks && (
                    <p><span className="text-muted-foreground">Blocks:</span> {importData.page.contentJson.blocks.length}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Exported: {new Date(importData.exportedAt).toLocaleString()}
                  </p>
                </div>

                {pages.some(p => p.slug === importData.page.slug) && (
                  <div className="space-y-2">
                    <Label>A page with this slug already exists. What would you like to do?</Label>
                    <Select value={importMode} onValueChange={(v: 'create' | 'update') => setImportMode(v)}>
                      <SelectTrigger data-testid="select-import-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="create">Create as new page (with modified slug)</SelectItem>
                        <SelectItem value="update">Update existing page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  {importMode === 'create' 
                    ? "The page will be imported as a new draft page."
                    : "The existing page will be updated with the imported content."}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setIsImportDialogOpen(false); setImportData(null); }}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={importMutation.isPending} data-testid="button-confirm-import">
                {importMutation.isPending ? "Importing..." : "Import Page"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
