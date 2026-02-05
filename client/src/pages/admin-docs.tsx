import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Plus, Edit, Trash2, FileText, Eye, EyeOff, Search, 
  FolderOpen, History, ChevronRight, ChevronDown, Save, X, RotateCcw, 
  Sparkles, RefreshCw, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import ReactMarkdown from "react-markdown";
import AdminNav from "@/components/admin/AdminNav";

interface Doc {
  id: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  status: string;
  content: string;
  sortOrder: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  updatedByUserId: string | null;
}

interface DocVersion {
  id: string;
  docId: string;
  content: string;
  title: string;
  createdAt: string;
  createdByUserId: string | null;
}

interface DocsHealth {
  routeCount: number;
  envVarCount: number;
  integrationCount: number;
  tableCount: number;
  docsCount: number;
  lastGenerated: string | null;
  warnings: string[];
}

const CATEGORIES = [
  { value: "architecture", label: "Architecture" },
  { value: "integrations", label: "Integrations" },
  { value: "features", label: "Features" },
  { value: "data-model", label: "Data Model" },
  { value: "deployment", label: "Deployment" },
  { value: "security", label: "Security" },
  { value: "troubleshooting", label: "Troubleshooting" },
  { value: "general", label: "General" },
];

export default function AdminDocs() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES.map(c => c.value)));
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [editorTab, setEditorTab] = useState<string>("edit");
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category: "general",
    content: "",
    tags: [] as string[],
    status: "draft",
    sortOrder: 0,
    parentId: null as string | null,
  });

  const { data: docs = [], isLoading } = useQuery<Doc[]>({
    queryKey: ["/api/admin/docs", categoryFilter !== "all" ? categoryFilter : undefined],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await fetch(`/api/admin/docs?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch docs");
      return res.json();
    },
  });

  const { data: versions = [], refetch: refetchVersions } = useQuery<DocVersion[]>({
    queryKey: ["/api/admin/docs", selectedDoc?.id, "versions"],
    queryFn: async () => {
      if (!selectedDoc) return [];
      const res = await fetch(`/api/admin/docs/${selectedDoc.id}/versions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch versions");
      return res.json();
    },
    enabled: !!selectedDoc && showVersionHistory,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create document");
      }
      return res.json();
    },
    onSuccess: (newDoc) => {
      toast({ title: "Document created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
      setIsCreating(false);
      setSelectedDoc(newDoc);
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/docs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update document");
      return res.json();
    },
    onSuccess: (updated) => {
      toast({ title: "Document saved!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
      setSelectedDoc(updated);
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Failed to save document", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/docs/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete document");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document deleted!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
      setSelectedDoc(null);
    },
    onError: () => {
      toast({ title: "Failed to delete document", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const res = await fetch(`/api/admin/docs/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ publish }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: (updated) => {
      toast({ title: updated.status === "published" ? "Document published!" : "Document unpublished" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
      setSelectedDoc(updated);
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ docId, versionId }: { docId: string; versionId: string }) => {
      const res = await fetch(`/api/admin/docs/${docId}/restore/${versionId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to restore version");
      return res.json();
    },
    onSuccess: (restored) => {
      toast({ title: "Version restored!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
      refetchVersions();
      setSelectedDoc(restored);
      setShowVersionHistory(false);
    },
    onError: () => {
      toast({ title: "Failed to restore version", variant: "destructive" });
    },
  });

  // Health check query
  const { data: health, refetch: refetchHealth } = useQuery<DocsHealth>({
    queryKey: ["/api/admin/docs/health"],
    queryFn: async () => {
      const res = await fetch("/api/admin/docs/health", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch health");
      return res.json();
    },
    staleTime: 60000,
  });

  // Generate system docs mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/docs/generate", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate documentation");
      return res.json();
    },
    onSuccess: (result) => {
      toast({ 
        title: "Documentation generated!",
        description: `Created ${result.created}, updated ${result.updated} docs. Scanned ${result.stats.routes} routes, ${result.stats.tables} tables.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
      refetchHealth();
    },
    onError: () => {
      toast({ title: "Failed to generate documentation", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      slug: "",
      category: "general",
      content: "",
      tags: [],
      status: "draft",
      sortOrder: 0,
      parentId: null,
    });
  };

  const startEditing = (doc: Doc) => {
    setFormData({
      title: doc.title,
      slug: doc.slug,
      category: doc.category,
      content: doc.content,
      tags: doc.tags || [],
      status: doc.status,
      sortOrder: doc.sortOrder,
      parentId: doc.parentId,
    });
    setIsEditing(true);
  };

  const startCreating = () => {
    resetForm();
    setSelectedDoc(null);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleSave = () => {
    const data = {
      ...formData,
      slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    };

    if (isCreating) {
      createMutation.mutate(data);
    } else if (selectedDoc) {
      updateMutation.mutate({ id: selectedDoc.id, data });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (selectedDoc) {
      setFormData({
        title: selectedDoc.title,
        slug: selectedDoc.slug,
        category: selectedDoc.category,
        content: selectedDoc.content,
        tags: selectedDoc.tags || [],
        status: selectedDoc.status,
        sortOrder: selectedDoc.sortOrder,
        parentId: selectedDoc.parentId,
      });
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredDocs = docs.filter(doc => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return doc.title.toLowerCase().includes(search) || 
             doc.content.toLowerCase().includes(search) ||
             doc.tags.some(t => t.toLowerCase().includes(search));
    }
    return true;
  });

  const docsByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = filteredDocs.filter(d => d.category === cat.value);
    return acc;
  }, {} as Record<string, Doc[]>);

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access docs. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <AdminNav currentPage="docs" role={role} />

      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold font-sans">Docs Library</h2>
          {health && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-4">
              <span>{health.docsCount} docs</span>
              <span>•</span>
              <span>{health.routeCount} routes</span>
              <span>•</span>
              <span>{health.tableCount} tables</span>
              {health.warnings.length > 0 && (
                <Badge variant="outline" className="text-yellow-400 border-yellow-400/50 ml-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {health.warnings.length}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => generateMutation.mutate()} 
            variant="outline"
            disabled={generateMutation.isPending}
            data-testid="btn-generate-docs"
          >
            {generateMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate System Docs
          </Button>
          <Button onClick={startCreating} data-testid="btn-new-doc">
            <Plus className="w-4 h-4 mr-2" /> New Document
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Sidebar - TOC */}
        <aside className="w-72 bg-card border border-border rounded-lg flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-docs"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="text-muted-foreground text-sm p-4">Loading...</div>
            ) : (
              CATEGORIES.map(cat => (
                <div key={cat.value} className="mb-1">
                  <button
                    onClick={() => toggleCategory(cat.value)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary rounded-lg transition-colors"
                    data-testid={`btn-category-${cat.value}`}
                  >
                    {expandedCategories.has(cat.value) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <FolderOpen className="w-4 h-4 text-primary" />
                    <span>{cat.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {docsByCategory[cat.value]?.length || 0}
                    </Badge>
                  </button>
                  
                  {expandedCategories.has(cat.value) && docsByCategory[cat.value]?.length > 0 && (
                    <div className="ml-6 mt-1 space-y-1">
                      {docsByCategory[cat.value].map(doc => (
                        <button
                          key={doc.id}
                          onClick={() => {
                            setSelectedDoc(doc);
                            setIsCreating(false);
                            setIsEditing(false);
                            setShowVersionHistory(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                            selectedDoc?.id === doc.id
                              ? "bg-primary/20 text-primary"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                          data-testid={`btn-doc-${doc.id}`}
                        >
                          <FileText className="w-3 h-3" />
                          <span className="truncate flex-1 text-left">{doc.title}</span>
                          {doc.status === "draft" && (
                            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/50">
                              Draft
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-card border border-border rounded-lg flex flex-col overflow-hidden">
          {(selectedDoc || isCreating) ? (
            <>
              {/* Toolbar */}
              <div className="bg-secondary border-b border-border px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="text-lg font-semibold w-64"
                      placeholder="Document Title"
                      data-testid="input-doc-title"
                    />
                  ) : (
                    <h2 className="text-lg font-semibold">{selectedDoc?.title}</h2>
                  )}
                  
                  {selectedDoc && !isEditing && (
                    <Badge variant={selectedDoc.status === "published" ? "default" : "secondary"}>
                      {selectedDoc.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="ghost" onClick={handleCancel} data-testid="btn-cancel-edit">
                        <X className="w-4 h-4 mr-2" /> Cancel
                      </Button>
                      <Button 
                        onClick={handleSave} 
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="btn-save-doc"
                      >
                        <Save className="w-4 h-4 mr-2" /> Save
                      </Button>
                    </>
                  ) : selectedDoc && (
                    <>
                      <Button 
                        variant="ghost" 
                        onClick={() => setShowVersionHistory(!showVersionHistory)}
                        data-testid="btn-version-history"
                      >
                        <History className="w-4 h-4 mr-2" /> History
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => publishMutation.mutate({ 
                          id: selectedDoc.id, 
                          publish: selectedDoc.status !== "published" 
                        })}
                        data-testid="btn-toggle-publish"
                      >
                        {selectedDoc.status === "published" ? (
                          <><EyeOff className="w-4 h-4 mr-2" /> Unpublish</>
                        ) : (
                          <><Eye className="w-4 h-4 mr-2" /> Publish</>
                        )}
                      </Button>
                      <Button variant="ghost" onClick={() => startEditing(selectedDoc)} data-testid="btn-edit-doc">
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="text-red-400 hover:text-red-300"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this document?")) {
                            deleteMutation.mutate(selectedDoc.id);
                          }
                        }}
                        data-testid="btn-delete-doc"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Editor/Viewer */}
              <div className="flex-1 flex overflow-hidden">
                <div className={`flex-1 flex flex-col overflow-hidden ${showVersionHistory ? 'w-2/3' : ''}`}>
                  {isEditing ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="px-6 py-3 border-b border-border flex gap-4">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Slug</Label>
                          <Input
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            placeholder="document-slug"
                            className="text-sm"
                            data-testid="input-doc-slug"
                          />
                        </div>
                        <div className="w-40">
                          <Label className="text-xs text-muted-foreground">Category</Label>
                          <Select 
                            value={formData.category} 
                            onValueChange={(v) => setFormData({ ...formData, category: v })}
                          >
                            <SelectTrigger data-testid="select-category">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32">
                          <Label className="text-xs text-muted-foreground">Status</Label>
                          <Select 
                            value={formData.status} 
                            onValueChange={(v) => setFormData({ ...formData, status: v })}
                          >
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
                      
                      <Tabs value={editorTab} onValueChange={setEditorTab} className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="mx-6 mt-3">
                          <TabsTrigger value="edit">Edit</TabsTrigger>
                          <TabsTrigger value="preview">Preview</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="edit" className="flex-1 overflow-hidden m-0 px-6 pb-6">
                          <Textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="h-full font-mono text-sm resize-none"
                            placeholder="Write your documentation in Markdown..."
                            data-testid="textarea-doc-content"
                          />
                        </TabsContent>
                        
                        <TabsContent value="preview" className="flex-1 overflow-y-auto m-0 px-6 pb-6">
                          <div className="prose prose-invert max-w-none">
                            <ReactMarkdown>{formData.content || "*No content yet*"}</ReactMarkdown>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown>{selectedDoc?.content || "*No content*"}</ReactMarkdown>
                      </div>
                      
                      {selectedDoc && (
                        <div className="mt-8 pt-4 border-t border-border text-sm text-muted-foreground">
                          Last updated: {new Date(selectedDoc.updatedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Version History Panel */}
                {showVersionHistory && selectedDoc && (
                  <div className="w-80 border-l border-border bg-secondary flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <h3 className="font-medium">Version History</h3>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setShowVersionHistory(false)}
                        data-testid="btn-close-history"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2">
                      {versions.length === 0 ? (
                        <p className="text-muted-foreground text-sm p-4">No previous versions</p>
                      ) : (
                        versions.map(version => (
                          <div 
                            key={version.id} 
                            className="p-3 mb-2 bg-muted/50 rounded-lg"
                          >
                            <div className="text-sm font-medium">{version.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(version.createdAt).toLocaleString()}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 text-primary"
                              onClick={() => restoreMutation.mutate({ 
                                docId: selectedDoc.id, 
                                versionId: version.id 
                              })}
                              data-testid={`btn-restore-${version.id}`}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Restore
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Select a document or create a new one</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
