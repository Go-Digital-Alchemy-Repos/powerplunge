import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { useUpload } from "@/hooks/use-upload";
import {
  Image as ImageIcon,
  Upload,
  Search,
  Grid3X3,
  List,
  Trash2,
  Pencil,
  Copy,
  ExternalLink,
  FolderOpen,
  Filter,
  FileImage,
  HardDrive,
  X,
  Check,
  RefreshCw,
  Sparkles,
  Loader2,
} from "lucide-react";
import CmsV2Layout from "@/components/admin/CmsV2Layout";

interface MediaItem {
  id: string;
  filename: string;
  storagePath: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  title?: string;
  altText?: string;
  caption?: string;
  description?: string;
  tags: string[];
  usageCount: number;
  usedIn: { type: string; id: string; field: string }[];
  folder: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface MediaStats {
  totalItems: number;
  totalSize: number;
  totalSizeFormatted: string;
  byMimeType: Record<string, number>;
}

export default function AdminMediaLibrary() {
  const { admin: adminUser, isLoading: isAdminLoading, role, hasFullAccess } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { uploadFile, isUploading } = useUpload();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [selectedMimeType, setSelectedMimeType] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    altText: "",
    caption: "",
    description: "",
    tags: "",
  });
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);

  const { data: openaiStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/admin/media/openai/status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/media/openai/status");
      if (!res.ok) return { configured: false };
      return res.json();
    },
  });

  const { data: mediaItems = [], isLoading: isMediaLoading } = useQuery<MediaItem[]>({
    queryKey: ["/api/admin/media", { search: searchQuery, folder: selectedFolder, mimeType: selectedMimeType }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedFolder) params.set("folder", selectedFolder);
      if (selectedMimeType) params.set("mimeType", selectedMimeType);
      const res = await fetch(`/api/admin/media?${params}`);
      if (!res.ok) throw new Error("Failed to fetch media");
      return res.json();
    },
  });

  const { data: stats } = useQuery<MediaStats>({
    queryKey: ["/api/admin/media/stats/summary"],
    queryFn: async () => {
      const res = await fetch("/api/admin/media/stats/summary");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: folders = [] } = useQuery<string[]>({
    queryKey: ["/api/admin/media/folders/list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/media/folders/list");
      if (!res.ok) throw new Error("Failed to fetch folders");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MediaItem> }) => {
      const res = await fetch(`/api/admin/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update media");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({ title: "Media updated", description: "Changes saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update media", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media/stats/summary"] });
      toast({ title: "Media deleted", description: "Item removed from library" });
      setIsDetailOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      const result = await uploadFile(file);
      if (result) {
        const publicUrl = (result.metadata as any)?.publicUrl || result.objectPath;
        const mediaData = {
          filename: file.name,
          storagePath: result.objectPath,
          publicUrl: publicUrl,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          folder: "uploads",
        };

        await fetch("/api/admin/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mediaData),
        });

        queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/media/stats/summary"] });
        toast({ title: "Upload complete", description: `${file.name} added to library` });
      }
    }
    event.target.value = "";
  }, [uploadFile, queryClient, toast]);

  const openDetail = (item: MediaItem) => {
    setSelectedItem(item);
    setEditForm({
      title: item.title || "",
      altText: item.altText || "",
      caption: item.caption || "",
      description: item.description || "",
      tags: item.tags?.join(", ") || "",
    });
    setIsDetailOpen(true);
  };

  const saveChanges = () => {
    if (!selectedItem) return;
    updateMutation.mutate({
      id: selectedItem.id,
      updates: {
        title: editForm.title || undefined,
        altText: editForm.altText || undefined,
        caption: editForm.caption || undefined,
        description: editForm.description || undefined,
        tags: editForm.tags ? editForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      },
    });
  };

  const generateSeo = async () => {
    if (!selectedItem) return;
    
    setIsGeneratingSeo(true);
    try {
      const res = await fetch(`/api/admin/media/${selectedItem.id}/generate-seo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "Failed to generate SEO");
      }
      
      const recommendations = await res.json();
      setEditForm({
        ...editForm,
        title: recommendations.title || editForm.title,
        altText: recommendations.altText || editForm.altText,
        description: recommendations.description || editForm.description,
        tags: recommendations.tags?.join(", ") || editForm.tags,
      });
      
      toast({ title: "SEO Generated", description: "AI recommendations applied to form" });
    } catch (error: any) {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Copied", description: "URL copied to clipboard" });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <p className="text-gray-400">Please log in to access the Media Library.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdminLoading && !hasFullAccess) {
    return (
      <CmsV2Layout activeNav="media" breadcrumbs={[{ label: "Media Library" }]}>
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-gray-400">You don't have permission to access the media library. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </CmsV2Layout>
    );
  }

  return (
    <CmsV2Layout activeNav="media" breadcrumbs={[{ label: "Media Library" }]}>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileImage className="w-8 h-8 text-cyan-400" />
              Media Library
            </h1>
            <p className="text-gray-400 mt-1">Manage all uploaded images and media assets</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleUpload}
            />
            <Button
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={isUploading}
              className="bg-cyan-600 hover:bg-cyan-700"
              data-testid="upload-media-button"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Media"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.totalItems || 0}</p>
                <p className="text-xs text-gray-400">Total Items</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <HardDrive className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.totalSizeFormatted || "0 B"}</p>
                <p className="text-xs text-gray-400">Total Storage</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <FolderOpen className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{folders.length}</p>
                <p className="text-xs text-gray-400">Folders</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <FileImage className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.byMimeType?.image || 0}</p>
                <p className="text-xs text-gray-400">Images</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search by filename, title, alt text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                  data-testid="media-search-input"
                />
              </div>
              <Select value={selectedFolder || "__all__"} onValueChange={(v) => setSelectedFolder(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="All Folders" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="__all__">All Folders</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedMimeType || "__all__"} onValueChange={(v) => setSelectedMimeType(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="__all__">All Types</SelectItem>
                  <SelectItem value="image/">Images</SelectItem>
                  <SelectItem value="video/">Videos</SelectItem>
                  <SelectItem value="application/pdf">PDFs</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "bg-gray-700 text-white" : "text-gray-400"}
                  data-testid="view-mode-grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-gray-700 text-white" : "text-gray-400"}
                  data-testid="view-mode-list"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isMediaLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : mediaItems.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="py-20 text-center">
              <FileImage className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No media found</h3>
              <p className="text-gray-400 mb-6">
                {searchQuery || selectedFolder || selectedMimeType
                  ? "Try adjusting your search or filters"
                  : "Upload your first image to get started"}
              </p>
              {!searchQuery && !selectedFolder && !selectedMimeType && (
                <Button
                  onClick={() => document.getElementById("file-upload")?.click()}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Media
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {mediaItems.map((item) => (
              <div
                key={item.id}
                onClick={() => openDetail(item)}
                className="group cursor-pointer bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-cyan-500 transition-colors"
                data-testid={`media-item-${item.id}`}
              >
                <div className="aspect-square bg-gray-800 relative">
                  {item.mimeType.startsWith("image/") ? (
                    <img
                      src={item.publicUrl}
                      alt={item.altText || item.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                  {item.usageCount > 0 && (
                    <Badge className="absolute top-2 right-2 bg-cyan-600 text-white text-xs">
                      {item.usageCount}
                    </Badge>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-sm text-white truncate">{item.title || item.filename}</p>
                  <p className="text-xs text-gray-500">{formatBytes(item.fileSize)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-gray-900 border-gray-800">
            <div className="divide-y divide-gray-800">
              {mediaItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openDetail(item)}
                  className="flex items-center gap-4 p-4 hover:bg-gray-800/50 cursor-pointer transition-colors"
                  data-testid={`media-item-${item.id}`}
                >
                  <div className="w-16 h-16 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                    {item.mimeType.startsWith("image/") ? (
                      <img
                        src={item.publicUrl}
                        alt={item.altText || item.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{item.title || item.filename}</p>
                    <p className="text-sm text-gray-400">{item.altText || "No alt text"}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{formatBytes(item.fileSize)}</span>
                      {item.width && item.height && (
                        <span>{item.width} × {item.height}</span>
                      )}
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.usageCount > 0 && (
                      <Badge variant="secondary" className="bg-gray-700">
                        Used {item.usageCount}×
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-gray-400 border-gray-600">
                      {item.folder}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Media Details</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  {selectedItem.mimeType.startsWith("image/") ? (
                    <img
                      src={selectedItem.publicUrl}
                      alt={selectedItem.altText || selectedItem.filename}
                      className="w-full max-h-80 object-contain"
                    />
                  ) : (
                    <div className="h-48 flex items-center justify-center">
                      <FileImage className="w-16 h-16 text-gray-600" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <span className="text-sm text-gray-400">URL</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyUrl(selectedItem.publicUrl)}
                        className="text-gray-400 hover:text-white"
                        data-testid="copy-url-button"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <a
                        href={selectedItem.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <span className="text-gray-400">Size</span>
                      <p className="text-white">{formatBytes(selectedItem.fileSize)}</p>
                    </div>
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <span className="text-gray-400">Type</span>
                      <p className="text-white">{selectedItem.mimeType}</p>
                    </div>
                    {selectedItem.width && selectedItem.height && (
                      <div className="p-3 bg-gray-800 rounded-lg">
                        <span className="text-gray-400">Dimensions</span>
                        <p className="text-white">{selectedItem.width} × {selectedItem.height}</p>
                      </div>
                    )}
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <span className="text-gray-400">Uploaded</span>
                      <p className="text-white">{formatDate(selectedItem.createdAt)}</p>
                    </div>
                  </div>
                  {selectedItem.usageCount > 0 && (
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <span className="text-gray-400">Used in</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(selectedItem.usedIn || []).map((usage, i) => (
                          <Badge key={i} variant="outline" className="text-gray-300 border-gray-600">
                            {usage.type}: {usage.field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {openaiStatus?.configured && (
                  <Button
                    variant="outline"
                    onClick={generateSeo}
                    disabled={isGeneratingSeo}
                    className="w-full border-cyan-600 text-cyan-400 hover:bg-cyan-900/20"
                    data-testid="generate-seo-button"
                  >
                    {isGeneratingSeo ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {isGeneratingSeo ? "Generating..." : "Generate SEO with AI"}
                  </Button>
                )}
                <div>
                  <Label className="text-gray-300">Title</Label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="Image title for display"
                    data-testid="media-title-input"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Alt Text (SEO)</Label>
                  <Input
                    value={editForm.altText}
                    onChange={(e) => setEditForm({ ...editForm, altText: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="Descriptive text for accessibility and SEO"
                    data-testid="media-alt-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Describes the image for screen readers and search engines
                  </p>
                </div>
                <div>
                  <Label className="text-gray-300">Caption</Label>
                  <Input
                    value={editForm.caption}
                    onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="Optional caption displayed below image"
                    data-testid="media-caption-input"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="Detailed description of the image"
                    rows={3}
                    data-testid="media-description-input"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Tags</Label>
                  <Input
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white mt-1"
                    placeholder="product, hero, banner (comma separated)"
                    data-testid="media-tags-input"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between mt-6">
            <Button
              variant="destructive"
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
              disabled={deleteMutation.isPending || (selectedItem?.usageCount || 0) > 0}
              data-testid="delete-media-button"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {selectedItem?.usageCount ? `In Use (${selectedItem.usageCount})` : "Delete"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDetailOpen(false)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={saveChanges}
                disabled={updateMutation.isPending}
                className="bg-cyan-600 hover:bg-cyan-700"
                data-testid="save-media-button"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </CmsV2Layout>
  );
}
