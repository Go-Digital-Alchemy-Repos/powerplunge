import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import CmsV2Layout from "@/components/admin/CmsV2Layout";
import { Layers, Plus, Pencil, Trash2, MoreHorizontal, Copy, FileText, PackagePlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SavedSection {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  blocks: any;
  createdAt: string;
  updatedAt: string;
}

const SECTION_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "hero", label: "Hero" },
  { value: "content", label: "Content" },
  { value: "product", label: "Product" },
  { value: "testimonial", label: "Testimonial" },
  { value: "cta", label: "Call to Action" },
  { value: "kit", label: "Starter Kit" },
];

function getCategoryLabel(cat: string | null) {
  return SECTION_CATEGORIES.find((c) => c.value === cat)?.label ?? cat ?? "General";
}

function getBlockCount(blocks: any): number {
  if (Array.isArray(blocks)) return blocks.length;
  return 0;
}

export default function AdminCmsV2Sections() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editSection, setEditSection] = useState<SavedSection | null>(null);
  const [deleteSection, setDeleteSection] = useState<SavedSection | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("general");

  const { data: sections, isLoading } = useQuery<SavedSection[]>({
    queryKey: ["/api/admin/cms-v2/sections"],
    enabled: hasFullAccess,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; category: string }) => {
      const res = await apiRequest("POST", "/api/admin/cms-v2/sections", {
        name: data.name, description: data.description || null, category: data.category, blocks: [],
      });
      return res.json();
    },
    onSuccess: (section) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/sections"] });
      toast({ title: "Section created", description: `"${section.name}" is ready to use.` });
      setCreateOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create section", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description: string; category: string } }) => {
      const res = await apiRequest("PUT", `/api/admin/cms-v2/sections/${id}`, {
        name: data.name, description: data.description || null, category: data.category,
      });
      return res.json();
    },
    onSuccess: (section) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/sections"] });
      toast({ title: "Section updated", description: `"${section.name}" has been updated.` });
      setEditSection(null);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update section", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/admin/cms-v2/sections/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/sections"] });
      toast({ title: "Section deleted" });
      setDeleteSection(null);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete section", description: err.message, variant: "destructive" });
    },
  });

  const seedKitsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/cms-v2/sections/seed-kits");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/sections"] });
      if (result.created > 0) {
        toast({ title: "Starter kits loaded", description: `${result.created} kit(s) added.${result.skipped > 0 ? ` ${result.skipped} already existed.` : ""}` });
      } else {
        toast({ title: "Kits already loaded", description: "All starter kits are already in your library." });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Failed to load kits", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() { setFormName(""); setFormDescription(""); setFormCategory("general"); }
  function openCreate() { resetForm(); setCreateOpen(true); }
  function openEdit(section: SavedSection) {
    setFormName(section.name); setFormDescription(section.description ?? ""); setFormCategory(section.category ?? "general"); setEditSection(section);
  }
  function handleCreate() { if (!formName.trim()) return; createMutation.mutate({ name: formName.trim(), description: formDescription.trim(), category: formCategory }); }
  function handleUpdate() { if (!editSection || !formName.trim()) return; updateMutation.mutate({ id: editSection.id, data: { name: formName.trim(), description: formDescription.trim(), category: formCategory } }); }
  function copyId(id: string) { navigator.clipboard.writeText(id); toast({ title: "Section ID copied" }); }

  if (adminLoading || !hasFullAccess) {
    return (
      <CmsV2Layout activeNav="sections" breadcrumbs={[{ label: "Sections" }]}>
        <div className="p-8 text-center text-muted-foreground">{adminLoading ? "Loading..." : "Access Denied"}</div>
      </CmsV2Layout>
    );
  }

  return (
    <CmsV2Layout activeNav="sections" breadcrumbs={[{ label: "Sections" }]}>
      <div className="max-w-5xl mx-auto" data-testid="admin-cms-v2-sections-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              Sections
              {!isLoading && sections && <span className="text-sm font-normal text-muted-foreground">{sections.length} total</span>}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => seedKitsMutation.mutate()}
              disabled={seedKitsMutation.isPending}
              className="border-border text-foreground/80 hover:text-foreground hover:bg-muted h-8 text-xs"
              data-testid="button-load-starter-kits"
            >
              <PackagePlus className="w-3.5 h-3.5 mr-1" />
              {seedKitsMutation.isPending ? "Loading..." : "Load Starter Kits"}
            </Button>
            <Button onClick={openCreate} className="bg-primary text-foreground h-8 text-xs" data-testid="button-create-section">
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Section
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-card/40 rounded-lg animate-pulse" />)}
          </div>
        ) : !sections || sections.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-10 text-center">
              <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-2">No saved sections yet.</p>
              <p className="text-muted-foreground/60 text-xs mb-4">Create reusable sections to insert across multiple pages.</p>
              <Button onClick={openCreate} className="bg-primary text-foreground text-xs" data-testid="button-create-first-section">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create First Section
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sections.map((section) => (
              <Card key={section.id} className="bg-card border-border hover:border-border transition-colors" data-testid={`card-section-${section.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-foreground text-sm truncate" data-testid={`text-section-name-${section.id}`}>{section.name}</h3>
                      {section.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{section.description}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground h-7 w-7 p-0 flex-shrink-0" data-testid={`button-actions-${section.id}`}>
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                        <DropdownMenuItem className="cursor-pointer hover:bg-muted focus:bg-muted text-xs" onClick={() => openEdit(section)} data-testid={`action-edit-${section.id}`}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer hover:bg-muted focus:bg-muted text-xs" onClick={() => copyId(section.id)} data-testid={`action-copy-id-${section.id}`}>
                          <Copy className="w-3.5 h-3.5 mr-2" /> Copy ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-muted" />
                        <DropdownMenuItem className="cursor-pointer text-red-400 hover:bg-muted focus:bg-muted focus:text-red-400 text-xs" onClick={() => setDeleteSection(section)} data-testid={`action-delete-${section.id}`}>
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className="border-border/60 text-muted-foreground text-[10px]">{getCategoryLabel(section.category)}</Badge>
                    <Badge variant="outline" className="border-border/60 text-muted-foreground/60 text-[10px] gap-1">
                      <FileText className="w-2.5 h-2.5" />{getBlockCount(section.blocks)} blocks
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border text-foreground" data-testid="dialog-create-section">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create New Section</DialogTitle>
            <DialogDescription className="text-muted-foreground">Create a reusable section for the page builder.</DialogDescription>
          </DialogHeader>
          <SectionForm name={formName} description={formDescription} category={formCategory} onNameChange={setFormName} onDescriptionChange={setFormDescription} onCategoryChange={setFormCategory} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} className="text-muted-foreground hover:text-foreground" data-testid="button-cancel-create">Cancel</Button>
            <Button onClick={handleCreate} disabled={!formName.trim() || createMutation.isPending} className="bg-primary text-foreground" data-testid="button-confirm-create">{createMutation.isPending ? "Creating..." : "Create Section"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSection} onOpenChange={() => setEditSection(null)}>
        <DialogContent className="bg-card border-border text-foreground" data-testid="dialog-edit-section">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Section</DialogTitle>
            <DialogDescription className="text-muted-foreground">Update section details.</DialogDescription>
          </DialogHeader>
          <SectionForm name={formName} description={formDescription} category={formCategory} onNameChange={setFormName} onDescriptionChange={setFormDescription} onCategoryChange={setFormCategory} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditSection(null)} className="text-muted-foreground hover:text-foreground" data-testid="button-cancel-edit">Cancel</Button>
            <Button onClick={handleUpdate} disabled={!formName.trim() || updateMutation.isPending} className="bg-primary text-foreground" data-testid="button-confirm-edit">{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteSection} onOpenChange={() => setDeleteSection(null)}>
        <DialogContent className="bg-card border-border text-foreground" data-testid="dialog-delete-section">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Section</DialogTitle>
            <DialogDescription className="text-muted-foreground">Are you sure you want to delete "{deleteSection?.name}"?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteSection(null)} className="text-muted-foreground hover:text-foreground" data-testid="button-cancel-delete">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteSection && deleteMutation.mutate(deleteSection.id)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete">{deleteMutation.isPending ? "Deleting..." : "Delete Section"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CmsV2Layout>
  );
}

function SectionForm({ name, description, category, onNameChange, onDescriptionChange, onCategoryChange }: {
  name: string; description: string; category: string; onNameChange: (v: string) => void; onDescriptionChange: (v: string) => void; onCategoryChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="section-name" className="text-foreground/80 text-sm">Name</Label>
        <Input id="section-name" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g., Hero with CTA" className="bg-muted border-border text-foreground placeholder:text-muted-foreground" data-testid="input-section-name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="section-description" className="text-foreground/80 text-sm">Description</Label>
        <Textarea id="section-description" value={description} onChange={(e) => onDescriptionChange(e.target.value)} placeholder="Optional description" rows={2} className="bg-muted border-border text-foreground placeholder:text-muted-foreground" data-testid="input-section-description" />
      </div>
      <div className="space-y-2">
        <Label className="text-foreground/80 text-sm">Category</Label>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="bg-muted border-border text-foreground" data-testid="select-section-category"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-muted border-border text-foreground">
            {SECTION_CATEGORIES.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
