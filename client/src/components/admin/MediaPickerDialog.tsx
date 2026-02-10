import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import {
  Image as ImageIcon,
  Upload,
  Search,
  Grid3X3,
  List,
  Check,
  Loader2,
  X,
} from "lucide-react";

interface MediaItem {
  id: number;
  filename: string;
  storagePath: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  altText?: string;
  title?: string;
  folder?: string;
  createdAt: string;
}

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, media?: MediaItem) => void;
  accept?: string;
  title?: string;
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  accept = "image/*",
  title = "Select from Media Library",
}: MediaPickerDialogProps) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  const { data: mediaItems = [], isLoading } = useQuery<MediaItem[]>({
    queryKey: ["/api/admin/media", { search: searchQuery, folder: selectedFolder }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedFolder) params.set("folder", selectedFolder);
      const mimeFilter = accept.includes("image") ? "image" : "";
      if (mimeFilter) params.set("mimeType", mimeFilter);
      const res = await fetch(`/api/admin/media?${params}`);
      if (!res.ok) throw new Error("Failed to fetch media");
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        console.error("Unexpected response format:", contentType);
        return [];
      }
      return res.json();
    },
    enabled: open,
  });

  const { data: folders = [] } = useQuery<string[]>({
    queryKey: ["/api/admin/media/folders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/media/folders");
      if (!res.ok) return [];
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) return [];
      return res.json();
    },
    enabled: open,
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

        toast({ title: "Uploaded", description: `${file.name} added to library` });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
    event.target.value = "";
  }, [uploadFile, toast, queryClient]);

  const handleSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem.publicUrl, selectedItem);
      onOpenChange(false);
      setSelectedItem(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-900 border-gray-800 flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-cyan-400" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 py-3 border-b border-gray-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search media..."
              className="pl-10 bg-gray-800 border-gray-700 text-white"
              data-testid="media-picker-search"
            />
          </div>
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white" data-testid="media-picker-folder">
              <SelectValue placeholder="All folders" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All folders</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder} value={folder}>{folder}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="text-gray-400"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="text-gray-400"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept={accept}
              multiple
              onChange={handleUpload}
              className="hidden"
              data-testid="media-picker-upload"
            />
            <Button variant="outline" size="sm" className="border-cyan-600 text-cyan-400" asChild>
              <span>
                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload
              </span>
            </Button>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ImageIcon className="w-12 h-12 mb-3" />
              <p>No media found</p>
              <p className="text-sm mt-1">Upload images or adjust your search</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 p-2">
              {mediaItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedItem?.id === item.id
                      ? "border-cyan-400 ring-2 ring-cyan-400/50"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                  data-testid={`media-picker-item-${item.id}`}
                >
                  {item.mimeType.startsWith("image/") ? (
                    <img
                      src={item.publicUrl}
                      alt={item.altText || item.filename}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-800 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  {selectedItem?.id === item.id && (
                    <div className="absolute top-1 right-1 bg-cyan-500 rounded-full p-1">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {mediaItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`flex items-center gap-4 p-3 cursor-pointer transition-colors ${
                    selectedItem?.id === item.id
                      ? "bg-cyan-900/20"
                      : "hover:bg-gray-800/50"
                  }`}
                  data-testid={`media-picker-item-${item.id}`}
                >
                  <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                    {item.mimeType.startsWith("image/") ? (
                      <img
                        src={item.publicUrl}
                        alt={item.altText || item.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{item.title || item.filename}</p>
                    <p className="text-gray-500 text-xs">
                      {formatBytes(item.fileSize)} {item.width && item.height && `• ${item.width}×${item.height}`}
                    </p>
                  </div>
                  {selectedItem?.id === item.id && (
                    <Check className="w-5 h-5 text-cyan-400" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-gray-800 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-400">
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedItem}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
            data-testid="media-picker-select"
          >
            Select Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
