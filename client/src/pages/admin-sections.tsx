import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Trash2, Edit, Copy, Layers, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import AdminNav from "@/components/admin/AdminNav";
import { useAdmin } from "@/hooks/use-admin";

interface SavedSection {
  id: string;
  name: string;
  blockType: string;
  blockData: Record<string, any>;
  createdAt: string;
}

export default function AdminSections() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: sections = [], isLoading } = useQuery<SavedSection[]>({
    queryKey: ["/api/admin/saved-sections"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/saved-sections/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete section");
    },
    onSuccess: () => {
      toast({ title: "Section deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/saved-sections"] });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete section", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/admin/saved-sections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to update section");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Section updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/saved-sections"] });
      setEditId(null);
    },
    onError: () => {
      toast({ title: "Failed to update section", variant: "destructive" });
    },
  });

  const handleEdit = (section: SavedSection) => {
    setEditId(section.id);
    setEditName(section.name);
  };

  const handleSaveEdit = () => {
    if (editId && editName.trim()) {
      updateMutation.mutate({ id: editId, name: editName.trim() });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getBlockTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hero: "Hero Section",
      productGrid: "Product Grid",
      featureList: "Feature List",
      testimonial: "Testimonial",
      faq: "FAQ",
      cta: "Call to Action",
      image: "Image",
      text: "Text Block",
      videoEmbed: "Video Embed",
    };
    return labels[type] || type;
  };

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access sections. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="sections" role={role} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Saved Sections</h2>
            <p className="text-muted-foreground mt-1">
              Reusable content blocks you can add to any page
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : sections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No saved sections yet</h3>
              <p className="text-muted-foreground mb-4">
                Create sections in the page builder and save them for reuse across pages.
              </p>
              <Button onClick={() => navigate("/admin/pages")}>
                <LayoutGrid className="w-4 h-4 mr-2" />
                Go to Pages
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <Card key={section.id} className="group" data-testid={`section-card-${section.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{section.name}</span>
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                      {getBlockTypeLabel(section.blockType)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Created {formatDate(section.createdAt)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(section)}
                      data-testid={`edit-section-${section.id}`}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Rename
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(section.id)}
                      data-testid={`delete-section-${section.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Section</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Are you sure you want to delete this saved section? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Section</DialogTitle>
            </DialogHeader>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Section name"
              data-testid="input-section-name"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditId(null)}>
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending || !editName.trim()}
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
