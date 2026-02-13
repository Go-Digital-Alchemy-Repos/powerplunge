import { useState, useEffect, useMemo, useCallback } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import CmsLayout from "@/components/admin/CmsLayout";
import {
  ArrowLeft, Save, Globe, GlobeLock, Clock, Blocks, Calendar, History,
  Plus, X, Search as SearchIcon, Archive, ImageIcon, Trash2, PanelRight, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { MediaPickerDialog } from "@/components/admin/MediaPickerDialog";
import RichTextEditor from "@/components/admin/RichTextEditor";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const COLLAPSE_STORAGE_KEY = "cms-post-editor-collapsed";

function getCollapsedState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCollapsedState(key: string, collapsed: boolean) {
  const state = getCollapsedState();
  state[key] = collapsed;
  localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(state));
}

function useCollapsibleCards() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => getCollapsedState());

  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      setCollapsedState(key, next[key]);
      return next;
    });
  }, []);

  const isCollapsed = useCallback((key: string) => !!collapsed[key], [collapsed]);

  return { toggle, isCollapsed };
}

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function CollapsibleCard({
  sectionKey,
  title,
  icon,
  isCollapsed,
  onToggle,
  children,
  className,
  "data-testid": testId,
  dragHandleProps,
}: {
  sectionKey: string;
  title: string;
  icon?: React.ReactNode;
  isCollapsed: boolean;
  onToggle: (key: string) => void;
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
  dragHandleProps?: any;
}) {
  return (
    <Card className={`bg-card border-border ${className || ""}`} data-testid={testId}>
      <CardHeader
        className="pb-3 select-none flex flex-row items-center justify-between space-y-0"
        data-testid={`collapse-toggle-${sectionKey}`}
      >
        <div 
          className="flex items-center gap-2 cursor-pointer flex-1"
          onClick={() => onToggle(sectionKey)}
        >
          {icon}
          <CardTitle className="text-sm text-foreground/80">
            {title}
          </CardTitle>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
          />
        </div>
        <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
          <GripVertical className="w-4 h-4" />
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-3">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

function SortableSection({ id, children, ...props }: { id: string; children: React.ReactElement; [key: string]: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {React.cloneElement(children, { dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

const SIDEBAR_ORDER_KEY = "cms-post-editor-sidebar-order";

function getSidebarOrder(): string[] {
  try {
    const raw = localStorage.getItem(SIDEBAR_ORDER_KEY);
    return raw ? JSON.parse(raw) : ["status", "featured-image", "categories", "tags", "sidebar", "options", "revisions"];
  } catch {
    return ["status", "featured-image", "categories", "tags", "sidebar", "options", "revisions"];
  }
}

function saveSidebarOrder(order: string[]) {
  localStorage.setItem(SIDEBAR_ORDER_KEY, JSON.stringify(order));
}

export default function AdminCmsPostEditor() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { toggle, isCollapsed } = useCollapsibleCards();
  const [, navigate] = useLocation();
  const [matchEdit, paramsEdit] = useRoute("/admin/cms/posts/:id/edit");
  const [matchNew] = useRoute("/admin/cms/posts/new");
  const isNew = matchNew;
  const postId = paramsEdit?.id;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [legacyHtml, setLegacyHtml] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [ogImageId, setOgImageId] = useState("");
  const [coverImageId, setCoverImageId] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [allowIndex, setAllowIndex] = useState(true);
  const [allowFollow, setAllowFollow] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [readingTimeMinutes, setReadingTimeMinutes] = useState<number | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [showRevisions, setShowRevisions] = useState(false);
  const [sidebarId, setSidebarId] = useState<string | null>(null);
  const [sidebarInitialized, setSidebarInitialized] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { data: post, isLoading: postLoading } = useQuery<any>({
    queryKey: ["/api/admin/cms/posts", postId],
    queryFn: () => apiRequest("GET", `/api/admin/cms/posts/${postId}`).then((r) => r.json()),
    enabled: !!postId,
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/cms/post-categories"],
    queryFn: () => apiRequest("GET", "/api/admin/cms/post-categories").then((r) => r.json()),
  });

  const { data: tags = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/cms/post-tags"],
    queryFn: () => apiRequest("GET", "/api/admin/cms/post-tags").then((r) => r.json()),
  });

  const { data: sidebarsList = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/cms/sidebars"],
    queryFn: () => apiRequest("GET", "/api/admin/cms/sidebars").then((r) => r.json()),
  });

  const { data: revisions = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/cms/posts", postId, "revisions"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/cms/posts/${postId}`);
      const data = await res.json();
      return data.revisions || [];
    },
    enabled: !!postId && showRevisions,
  });

  useEffect(() => {
    if (post && !dirty) {
      setTitle(post.title || "");
      setSlug(post.slug || "");
      setSlugManual(true);
      setExcerpt(post.excerpt || "");
      setLegacyHtml(post.legacyHtml || "");
      setCanonicalUrl(post.canonicalUrl || "");
      setOgImageId(post.ogImageId || "");
      setCoverImageId(post.coverImageId || "");
      setCoverImageUrl(post.coverImageUrl || "");
      setAllowIndex(post.allowIndex ?? true);
      setAllowFollow(post.allowFollow ?? true);
      setFeatured(post.featured ?? false);
      setReadingTimeMinutes(post.readingTimeMinutes || null);
      setSelectedCategoryIds((post.categories || []).map((c: any) => c.id));
      setSelectedTagIds((post.tags || []).map((t: any) => t.id));
      setSidebarId(post.sidebarId ?? null);
      setSidebarInitialized(true);
    }
  }, [post]);

  useEffect(() => {
    if (isNew && !sidebarInitialized && sidebarsList.length > 0) {
      const blogSidebar = sidebarsList.find((s: any) => s.slug === "blog-sidebar");
      if (blogSidebar) {
        setSidebarId(blogSidebar.id);
      }
      setSidebarInitialized(true);
    }
  }, [isNew, sidebarInitialized, sidebarsList]);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/cms/posts", data).then((r) => r.json()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/posts"] });
      toast({ title: "Post created" });
      navigate(`/admin/cms/posts/${data.id}/edit`);
    },
    onError: (err: any) => toast({ title: "Failed to create post", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/admin/cms/posts/${postId}`, data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/posts"] });
      toast({ title: "Post saved" });
      setDirty(false);
    },
    onError: (err: any) => toast({ title: "Failed to save post", description: err.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/cms/posts/${postId}/publish`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/posts"] });
      toast({ title: "Post published" });
    },
    onError: () => toast({ title: "Failed to publish", variant: "destructive" }),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/cms/posts/${postId}/unpublish`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/posts"] });
      toast({ title: "Post unpublished" });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (scheduledAt: string) =>
      apiRequest("POST", `/api/admin/cms/posts/${postId}/schedule`, { scheduledAt }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/posts"] });
      toast({ title: "Post scheduled" });
      setShowSchedule(false);
    },
    onError: (err: any) => toast({ title: "Failed to schedule", description: err.message, variant: "destructive" }),
  });

  const createTagMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/cms/post-tags", data).then((r) => r.json()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/post-tags"] });
      setSelectedTagIds((prev) => [...prev, data.id]);
      setNewTagName("");
      setDirty(true);
    },
    onError: () => toast({ title: "Failed to create tag", variant: "destructive" }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/cms/post-categories", data).then((r) => r.json()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/post-categories"] });
      setSelectedCategoryIds((prev) => [...prev, data.id]);
      setNewCategoryName("");
      setDirty(true);
    },
    onError: () => toast({ title: "Failed to create category", variant: "destructive" }),
  });

  function handleSave() {
    const data: any = {
      title,
      slug: slug || slugify(title),
      excerpt: excerpt || null,
      legacyHtml: legacyHtml || null,
      canonicalUrl: canonicalUrl || null,
      ogImageId: (ogImageId || coverImageId) || null,
      coverImageId: coverImageId || null,
      allowIndex,
      allowFollow,
      featured,
      readingTimeMinutes: readingTimeMinutes || null,
      sidebarId: sidebarId || null,
      categoryIds: selectedCategoryIds,
      tagIds: selectedTagIds,
    };

    if (isNew) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  }

  function handleAddNewTag() {
    if (!newTagName.trim()) return;
    const tagSlug = slugify(newTagName.trim());
    createTagMutation.mutate({ name: newTagName.trim(), slug: tagSlug });
  }

  function handleAddNewCategory() {
    if (!newCategoryName.trim()) return;
    const catSlug = slugify(newCategoryName.trim());
    createCategoryMutation.mutate({ name: newCategoryName.trim(), slug: catSlug });
  }

  const categoryOptions = useMemo(() => {
    return categories.filter((c: any) => !selectedCategoryIds.includes(c.id));
  }, [categories, selectedCategoryIds]);

  const tagOptions = useMemo(() => {
    return tags.filter((t: any) => !selectedTagIds.includes(t.id));
  }, [tags, selectedTagIds]);

  const selectedCats = useMemo(() => categories.filter((c: any) => selectedCategoryIds.includes(c.id)), [categories, selectedCategoryIds]);
  const selectedTags = useMemo(() => tags.filter((t: any) => selectedTagIds.includes(t.id)), [tags, selectedTagIds]);

  const [sidebarOrder, setSidebarOrderState] = useState<string[]>(() => getSidebarOrder());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSidebarOrderState((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const next = arrayMove(items, oldIndex, newIndex);
        saveSidebarOrder(next);
        return next;
      });
    }
  };

  const renderSidebarSection = (sectionKey: string) => {
    switch (sectionKey) {
      case "status":
        return (
          <CollapsibleCard
            key="status"
            sectionKey="status"
            title="Status"
            isCollapsed={isCollapsed("status")}
            onToggle={toggle}
          >
            <div className="flex items-center gap-2">
              {status === "published" && <Badge className="bg-green-900/40 text-green-400 border-green-800"><Globe className="w-3 h-3 mr-1" />Published</Badge>}
              {status === "draft" && <Badge className="bg-muted text-muted-foreground border-border"><GlobeLock className="w-3 h-3 mr-1" />Draft</Badge>}
              {status === "scheduled" && <Badge className="bg-blue-900/40 text-blue-400 border-blue-800"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>}
              {status === "archived" && <Badge className="bg-orange-900/40 text-orange-400 border-orange-800"><Archive className="w-3 h-3 mr-1" />Archived</Badge>}
            </div>

            {!isNew && (
              <div className="flex flex-col gap-2">
                {status !== "published" && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 w-full gap-2"
                    onClick={() => publishMutation.mutate()}
                    disabled={publishMutation.isPending}
                    data-testid="button-publish-post"
                  >
                    <Globe className="w-4 h-4" />
                    {publishMutation.isPending ? "Publishing..." : "Publish Now"}
                  </Button>
                )}
                {status === "published" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-foreground/80 w-full gap-2"
                    onClick={() => unpublishMutation.mutate()}
                    disabled={unpublishMutation.isPending}
                    data-testid="button-unpublish-post"
                  >
                    <GlobeLock className="w-4 h-4" />
                    Unpublish
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border text-foreground/80 w-full gap-2"
                  onClick={() => setShowSchedule(true)}
                  data-testid="button-schedule-post"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule
                </Button>
              </div>
            )}

            {post?.publishedAt && (
              <p className="text-xs text-muted-foreground">Published: {formatDate(post.publishedAt)}</p>
            )}
            {post?.scheduledAt && (
              <p className="text-xs text-muted-foreground">Scheduled: {formatDate(post.scheduledAt)}</p>
            )}
          </CollapsibleCard>
        );
      case "featured-image":
        return (
          <CollapsibleCard
            key="featured-image"
            sectionKey="featured-image"
            title="Featured Image"
            isCollapsed={isCollapsed("featured-image")}
            onToggle={toggle}
          >
            {coverImageId && coverImageUrl ? (
              <div className="relative group">
                <div className="aspect-video rounded-lg overflow-hidden bg-muted border border-border">
                  <img
                    src={coverImageUrl}
                    alt="Featured image"
                    className="w-full h-full object-cover"
                    data-testid="img-cover-preview"
                  />
                </div>
                <div className="flex gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-foreground/80 flex-1 h-8 text-xs"
                    onClick={() => setShowMediaPicker(true)}
                    data-testid="button-change-cover"
                  >
                    <ImageIcon className="w-3 h-3 mr-1" />
                    Change
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-destructive hover:text-destructive h-8 px-2"
                    onClick={() => { setCoverImageId(""); setCoverImageUrl(""); setDirty(true); }}
                    data-testid="button-remove-cover"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="w-full aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/50 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
                data-testid="button-add-cover"
              >
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Click to add featured image</span>
              </button>
            )}
          </CollapsibleCard>
        );
      case "categories":
        return (
          <CollapsibleCard
            key="categories"
            sectionKey="categories"
            title="Categories"
            isCollapsed={isCollapsed("categories")}
            onToggle={toggle}
          >
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {selectedCats.map((cat: any) => (
                  <Badge key={cat.id} variant="outline" className="border-border text-foreground/80 gap-1">
                    {cat.name}
                    <button onClick={() => { setSelectedCategoryIds((prev) => prev.filter((id) => id !== cat.id)); setDirty(true); }} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {categoryOptions.length > 0 && (
                <Select onValueChange={(id) => { setSelectedCategoryIds((prev) => [...prev, id]); setDirty(true); }}>
                  <SelectTrigger className="bg-muted border-border text-foreground h-8 text-xs" data-testid="select-add-category">
                    <SelectValue placeholder="Add category..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {categoryOptions.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex gap-1">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Create new category..."
                  className="bg-muted border-border text-foreground h-8 text-xs flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNewCategory(); } }}
                  data-testid="input-new-category"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border text-foreground/80 h-8 px-2"
                  onClick={handleAddNewCategory}
                  disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                  data-testid="button-create-category"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CollapsibleCard>
        );
      case "tags":
        return (
          <CollapsibleCard
            key="tags"
            sectionKey="tags"
            title="Tags"
            isCollapsed={isCollapsed("tags")}
            onToggle={toggle}
          >
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {selectedTags.map((tag: any) => (
                  <Badge key={tag.id} variant="outline" className="border-primary/30 text-primary gap-1">
                    {tag.name}
                    <button onClick={() => { setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id)); setDirty(true); }} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {tagOptions.length > 0 && (
                <Select onValueChange={(id) => { setSelectedTagIds((prev) => [...prev, id]); setDirty(true); }}>
                  <SelectTrigger className="bg-muted border-border text-foreground h-8 text-xs" data-testid="select-add-tag">
                    <SelectValue placeholder="Add existing tag..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    {tagOptions.map((tag: any) => (
                      <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex gap-1">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Create new tag..."
                  className="bg-muted border-border text-foreground h-8 text-xs flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNewTag(); } }}
                  data-testid="input-new-tag"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border text-foreground/80 h-8 px-2"
                  onClick={handleAddNewTag}
                  disabled={!newTagName.trim() || createTagMutation.isPending}
                  data-testid="button-create-tag"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CollapsibleCard>
        );
      case "sidebar":
        return (
          <CollapsibleCard
            key="sidebar"
            sectionKey="sidebar"
            title="Sidebar"
            icon={<PanelRight className="w-3.5 h-3.5" />}
            isCollapsed={isCollapsed("sidebar")}
            onToggle={toggle}
          >
            <div className="space-y-2">
              <Select
                value={sidebarId || "__none__"}
                onValueChange={(v) => { setSidebarId(v === "__none__" ? null : v); setDirty(true); }}
              >
                <SelectTrigger className="bg-muted border-border text-foreground h-8 text-xs" data-testid="select-sidebar">
                  <SelectValue placeholder="Select sidebar..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="__none__">None</SelectItem>
                  {sidebarsList.filter((s: any) => s.isActive && (!s.location || s.location === "post_left")).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Choose a sidebar to display alongside this post, or select "None" for a full-width layout.</p>
            </div>
          </CollapsibleCard>
        );
      case "options":
        return (
          <CollapsibleCard
            key="options"
            sectionKey="options"
            title="Options"
            isCollapsed={isCollapsed("options")}
            onToggle={toggle}
          >
            <div className="flex items-center gap-2">
              <Switch
                checked={featured}
                onCheckedChange={(v) => { setFeatured(v); setDirty(true); }}
                data-testid="switch-featured"
              />
              <Label className="text-foreground/80 text-sm">Featured Post</Label>
            </div>
            <div>
              <Label className="text-foreground/80 text-sm">Reading Time (minutes)</Label>
              <Input
                type="number"
                min={1}
                value={readingTimeMinutes || ""}
                onChange={(e) => { setReadingTimeMinutes(e.target.value ? parseInt(e.target.value) : null); setDirty(true); }}
                placeholder="Auto"
                className="bg-muted border-border text-foreground mt-1 h-8 text-xs"
                data-testid="input-reading-time"
              />
            </div>
          </CollapsibleCard>
        );
      case "revisions":
        if (isNew) return null;
        return (
          <div key="revisions" className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground w-full gap-2"
              onClick={() => setShowRevisions(!showRevisions)}
              data-testid="button-toggle-revisions"
            >
              <History className="w-4 h-4" />
              Revision History
            </Button>
            {showRevisions && revisions.length > 0 && (
              <Card className="bg-card border-border">
                <CardContent className="p-3 space-y-2">
                  {revisions.map((rev: any, i: number) => (
                    <div key={rev.id || i} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                      <span className="text-xs text-muted-foreground">{formatDate(rev.createdAt)}</span>
                      <Badge variant="outline" className="text-xs border-border text-muted-foreground">v{revisions.length - i}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <CmsLayout activeNav="posts" breadcrumbs={[{ label: "Posts", href: "/admin/cms/posts" }, { label: isNew ? "New Post" : post?.title || "Edit" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground gap-2"
            onClick={() => navigate("/admin/cms/posts")}
            data-testid="button-back-to-posts"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Posts
          </Button>
          <div className="flex items-center gap-2">
            {!isNew && (
              <Button
                variant="outline"
                className="border-border text-foreground/80 hover:text-foreground gap-2"
                onClick={() => navigate(`/admin/cms/posts/${postId}/builder`)}
                data-testid="button-open-builder"
              >
                <Blocks className="w-4 h-4" />
                Open Builder
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!title || createMutation.isPending || updateMutation.isPending}
              className="bg-primary gap-2"
              data-testid="button-save-post"
            >
              <Save className="w-4 h-4" />
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : isNew ? "Create Post" : "Save"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label className="text-foreground/80">Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setDirty(true);
                      if (!slugManual) setSlug(slugify(e.target.value));
                    }}
                    placeholder="Post title"
                    className="bg-muted border-border text-foreground mt-1 text-lg"
                    data-testid="input-post-title"
                  />
                </div>
                <div>
                  <Label className="text-foreground/80">Slug</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground text-sm">/blog/</span>
                    <Input
                      value={slug}
                      onChange={(e) => { setSlug(e.target.value); setSlugManual(true); setDirty(true); }}
                      placeholder="post-slug"
                      className="bg-muted border-border text-foreground flex-1"
                      data-testid="input-post-slug"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-foreground/80">Excerpt</Label>
                  <Textarea
                    value={excerpt}
                    onChange={(e) => { setExcerpt(e.target.value); setDirty(true); }}
                    placeholder="Short summary for previews and SEO..."
                    className="bg-muted border-border text-foreground mt-1 min-h-[80px]"
                    data-testid="input-post-excerpt"
                  />
                </div>
                <div>
                  <Label className="text-foreground/80">Content</Label>
                  <RichTextEditor
                    value={legacyHtml}
                    onChange={(html) => { setLegacyHtml(html); setDirty(true); }}
                    placeholder="Write your content..."
                    data-testid="input-post-content"
                  />
                  <p className="text-xs text-muted-foreground mt-1">For rich visual content, use the Puck Builder.</p>
                </div>
              </CardContent>
            </Card>

            <CollapsibleCard
              sectionKey="seo"
              title="SEO & Meta"
              icon={<SearchIcon className="w-4 h-4 text-primary" />}
              isCollapsed={isCollapsed("seo")}
              onToggle={toggle}
            >
              <div className="space-y-4">
                <div>
                  <Label className="text-foreground/80">Canonical URL</Label>
                  <Input
                    value={canonicalUrl}
                    onChange={(e) => { setCanonicalUrl(e.target.value); setDirty(true); }}
                    placeholder="https://..."
                    className="bg-muted border-border text-foreground mt-1"
                    data-testid="input-post-canonical"
                  />
                </div>
                <div>
                  <Label className="text-foreground/80">OG Image ID</Label>
                  <Input
                    value={ogImageId}
                    onChange={(e) => { setOgImageId(e.target.value); setDirty(true); }}
                    placeholder="Image ID for social sharing"
                    className="bg-muted border-border text-foreground mt-1"
                    data-testid="input-post-og-image"
                  />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={allowIndex}
                      onCheckedChange={(v) => { setAllowIndex(v); setDirty(true); }}
                      data-testid="switch-allow-index"
                    />
                    <Label className="text-foreground/80 text-sm">Allow Index</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={allowFollow}
                      onCheckedChange={(v) => { setAllowFollow(v); setDirty(true); }}
                      data-testid="switch-allow-follow"
                    />
                    <Label className="text-foreground/80 text-sm">Allow Follow</Label>
                  </div>
                </div>
              </div>
            </CollapsibleCard>
          </div>

          <div className="space-y-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sidebarOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-6">
                  {sidebarOrder.map((id) => (
                    <SortableSection key={id} id={id}>
                      {renderSidebarSection(id) as React.ReactElement}
                    </SortableSection>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>

            <CollapsibleCard
              sectionKey="featured-image"
              title="Featured Image"
              isCollapsed={isCollapsed("featured-image")}
              onToggle={toggle}
            >
              {coverImageId && coverImageUrl ? (
                <div className="relative group">
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted border border-border">
                    <img
                      src={coverImageUrl}
                      alt="Featured image"
                      className="w-full h-full object-cover"
                      data-testid="img-cover-preview"
                    />
                  </div>
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-foreground/80 flex-1 h-8 text-xs"
                      onClick={() => setShowMediaPicker(true)}
                      data-testid="button-change-cover"
                    >
                      <ImageIcon className="w-3 h-3 mr-1" />
                      Change
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-destructive hover:text-destructive h-8 px-2"
                      onClick={() => { setCoverImageId(""); setCoverImageUrl(""); setDirty(true); }}
                      data-testid="button-remove-cover"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="w-full aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/50 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
                  data-testid="button-add-cover"
                >
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Click to add featured image</span>
                </button>
              )}
            </CollapsibleCard>

            <CollapsibleCard
              sectionKey="categories"
              title="Categories"
              isCollapsed={isCollapsed("categories")}
              onToggle={toggle}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {selectedCats.map((cat: any) => (
                    <Badge key={cat.id} variant="outline" className="border-border text-foreground/80 gap-1">
                      {cat.name}
                      <button onClick={() => { setSelectedCategoryIds((prev) => prev.filter((id) => id !== cat.id)); setDirty(true); }} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {categoryOptions.length > 0 && (
                  <Select onValueChange={(id) => { setSelectedCategoryIds((prev) => [...prev, id]); setDirty(true); }}>
                    <SelectTrigger className="bg-muted border-border text-foreground h-8 text-xs" data-testid="select-add-category">
                      <SelectValue placeholder="Add category..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {categoryOptions.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="flex gap-1">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Create new category..."
                    className="bg-muted border-border text-foreground h-8 text-xs flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNewCategory(); } }}
                    data-testid="input-new-category"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-foreground/80 h-8 px-2"
                    onClick={handleAddNewCategory}
                    disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                    data-testid="button-create-category"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CollapsibleCard>

            <CollapsibleCard
              sectionKey="tags"
              title="Tags"
              isCollapsed={isCollapsed("tags")}
              onToggle={toggle}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map((tag: any) => (
                    <Badge key={tag.id} variant="outline" className="border-primary/30 text-primary gap-1">
                      {tag.name}
                      <button onClick={() => { setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id)); setDirty(true); }} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                {tagOptions.length > 0 && (
                  <Select onValueChange={(id) => { setSelectedTagIds((prev) => [...prev, id]); setDirty(true); }}>
                    <SelectTrigger className="bg-muted border-border text-foreground h-8 text-xs" data-testid="select-add-tag">
                      <SelectValue placeholder="Add existing tag..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {tagOptions.map((tag: any) => (
                        <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="flex gap-1">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Create new tag..."
                    className="bg-muted border-border text-foreground h-8 text-xs flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNewTag(); } }}
                    data-testid="input-new-tag"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-foreground/80 h-8 px-2"
                    onClick={handleAddNewTag}
                    disabled={!newTagName.trim() || createTagMutation.isPending}
                    data-testid="button-create-tag"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CollapsibleCard>

            <CollapsibleCard
              sectionKey="sidebar"
              title="Sidebar"
              icon={<PanelRight className="w-3.5 h-3.5" />}
              isCollapsed={isCollapsed("sidebar")}
              onToggle={toggle}
            >
              <div className="space-y-2">
                <Select
                  value={sidebarId || "__none__"}
                  onValueChange={(v) => { setSidebarId(v === "__none__" ? null : v); setDirty(true); }}
                >
                  <SelectTrigger className="bg-muted border-border text-foreground h-8 text-xs" data-testid="select-sidebar">
                    <SelectValue placeholder="Select sidebar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectItem value="__none__">None</SelectItem>
                    {sidebarsList.filter((s: any) => s.isActive && (!s.location || s.location === "post_left")).map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Choose a sidebar to display alongside this post, or select "None" for a full-width layout.</p>
              </div>
            </CollapsibleCard>

            <CollapsibleCard
              sectionKey="options"
              title="Options"
              isCollapsed={isCollapsed("options")}
              onToggle={toggle}
            >
              <div className="flex items-center gap-2">
                <Switch
                  checked={featured}
                  onCheckedChange={(v) => { setFeatured(v); setDirty(true); }}
                  data-testid="switch-featured"
                />
                <Label className="text-foreground/80 text-sm">Featured Post</Label>
              </div>
              <div>
                <Label className="text-foreground/80 text-sm">Reading Time (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={readingTimeMinutes || ""}
                  onChange={(e) => { setReadingTimeMinutes(e.target.value ? parseInt(e.target.value) : null); setDirty(true); }}
                  placeholder="Auto"
                  className="bg-muted border-border text-foreground mt-1 h-8 text-xs"
                  data-testid="input-reading-time"
                />
              </div>
            </CollapsibleCard>

            {!isNew && (
              <Button
                variant="outline"
                size="sm"
                className="border-border text-muted-foreground w-full gap-2"
                onClick={() => setShowRevisions(!showRevisions)}
                data-testid="button-toggle-revisions"
              >
                <History className="w-4 h-4" />
                Revision History
              </Button>
            )}

            {showRevisions && revisions.length > 0 && (
              <Card className="bg-card border-border">
                <CardContent className="p-3 space-y-2">
                  {revisions.map((rev: any, i: number) => (
                    <div key={rev.id || i} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                      <span className="text-xs text-muted-foreground">{formatDate(rev.createdAt)}</span>
                      <Badge variant="outline" className="text-xs border-border text-muted-foreground">v{revisions.length - i}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <MediaPickerDialog
        open={showMediaPicker}
        onOpenChange={setShowMediaPicker}
        onSelect={(url, media) => {
          if (media) {
            setCoverImageId(String(media.id));
            setCoverImageUrl(media.publicUrl || url);
            setDirty(true);
          }
        }}
        accept="image/*"
        title="Select Featured Image"
      />

      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule Post</DialogTitle>
            <DialogDescription className="text-muted-foreground">Choose when to publish this post.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-foreground/80">Publish Date & Time</Label>
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="bg-muted border-border text-foreground mt-1"
              data-testid="input-schedule-date"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSchedule(false)}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              onClick={() => {
                if (scheduleDate) {
                  scheduleMutation.mutate(new Date(scheduleDate).toISOString());
                }
              }}
              disabled={!scheduleDate || scheduleMutation.isPending}
              data-testid="button-confirm-schedule"
            >
              <Calendar className="w-4 h-4" />
              {scheduleMutation.isPending ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CmsLayout>
  );
}
