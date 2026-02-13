import { useState, useCallback, useMemo } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import CmsLayout from "@/components/admin/CmsLayout";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Menu,
  Plus,
  Trash2,
  Pencil,
  GripVertical,
  ExternalLink,
  FileText,
  PenLine,
  Link2,
  Tag,
  Layout,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Save,
  ArrowLeft,
  CornerDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

interface MenuItemData {
  id: string;
  type: "page" | "post" | "external" | "label";
  label: string;
  href: string;
  url: string;
  pageId?: string;
  pageSlug?: string;
  postId?: string;
  postSlug?: string;
  target: "_self" | "_blank";
  order: number;
  children: MenuItemData[];
}

interface MenuData {
  id: string;
  name: string;
  location: string;
  items: MenuItemData[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const MAX_DEPTH = 3;

const SYSTEM_PAGES = [
  { id: "system-home", title: "Home", slug: "", path: "/" },
  { id: "system-shop", title: "Shop", slug: "shop", path: "/shop" },
  { id: "system-blog", title: "Blog", slug: "blog", path: "/blog" },
  { id: "system-my-account", title: "My Account", slug: "my-account", path: "/my-account" },
  { id: "system-track-order", title: "Track Order", slug: "track-order", path: "/track-order" },
  { id: "system-checkout", title: "Checkout", slug: "checkout", path: "/checkout" },
  { id: "system-login", title: "Login", slug: "login", path: "/login" },
  { id: "system-register", title: "Register", slug: "register", path: "/register" },
  { id: "system-become-affiliate", title: "Become an Affiliate", slug: "become-affiliate", path: "/become-affiliate" },
  { id: "system-affiliate-portal", title: "Affiliate Portal", slug: "affiliate-portal", path: "/affiliate-portal" },
];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function getItemTypeIcon(type: string) {
  switch (type) {
    case "page": return <FileText className="w-3.5 h-3.5 text-blue-400" />;
    case "post": return <PenLine className="w-3.5 h-3.5 text-green-400" />;
    case "external": return <Link2 className="w-3.5 h-3.5 text-orange-400" />;
    case "label": return <Tag className="w-3.5 h-3.5 text-purple-400" />;
    default: return <Link2 className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function getItemTypeLabel(type: string) {
  switch (type) {
    case "page": return "Page";
    case "post": return "Post";
    case "external": return "Custom Link";
    case "label": return "Label";
    default: return type;
  }
}

function flattenForDnd(items: MenuItemData[], parentId: string | null = null): { item: MenuItemData; parentId: string | null; depth: number }[] {
  const result: { item: MenuItemData; parentId: string | null; depth: number }[] = [];
  function walk(list: MenuItemData[], pid: string | null, depth: number) {
    for (const item of list) {
      result.push({ item, parentId: pid, depth });
      if (item.children?.length) {
        walk(item.children, item.id, depth + 1);
      }
    }
  }
  walk(items, parentId, 0);
  return result;
}

function SortableMenuItem({
  item,
  depth,
  onEdit,
  onRemove,
  onToggleChildren,
  expandedIds,
  onAddChild,
  onMoveToParent,
  canMoveUp,
}: {
  item: MenuItemData;
  depth: number;
  onEdit: (item: MenuItemData) => void;
  onRemove: (id: string) => void;
  onToggleChildren: (id: string) => void;
  expandedIds: Set<string>;
  onAddChild: (parentId: string) => void;
  onMoveToParent: (id: string) => void;
  canMoveUp: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasChildren = item.children?.length > 0;
  const isExpanded = expandedIds.has(item.id);
  const SLUG_TO_ROUTE: Record<string, string> = {
    "home": "/", "shop": "/shop", "blog": "/blog", "my-account": "/my-account",
    "track-order": "/track-order", "checkout": "/checkout", "login": "/login",
    "register": "/register", "become-affiliate": "/become-affiliate", "affiliate-portal": "/affiliate-portal",
  };
  const resolvedHref = item.type === "page" && item.pageSlug
    ? (SLUG_TO_ROUTE[item.pageSlug] || `/page/${item.pageSlug}`)
    : item.type === "post" ? `/blog/${item.postSlug || ""}` :
      item.href || item.url || "";

  return (
    <div ref={setNodeRef} style={style} className="select-none">
      <div
        className={`flex items-center gap-2 bg-muted border border-border/40 rounded-md p-2 group hover:border-border/60 transition-colors ${
          isDragging ? "shadow-lg ring-1 ring-primary/30" : ""
        }`}
        style={{ marginLeft: `${depth * 28}px` }}
        data-testid={`menu-item-row-${item.id}`}
      >
        <button
          className="text-muted-foreground/60 hover:text-muted-foreground cursor-grab active:cursor-grabbing p-0.5 touch-none"
          {...attributes}
          {...listeners}
          data-testid={`drag-handle-${item.id}`}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {hasChildren ? (
          <button
            onClick={() => onToggleChildren(item.id)}
            className="text-muted-foreground hover:text-foreground p-0.5"
            data-testid={`toggle-children-${item.id}`}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {getItemTypeIcon(item.type)}

        <span className="text-sm text-foreground font-medium truncate flex-1" data-testid={`menu-item-label-${item.id}`}>
          {item.label || "(untitled)"}
        </span>

        {item.type !== "label" && resolvedHref && (
          <span className="text-xs text-muted-foreground truncate max-w-[150px] hidden md:inline" title={resolvedHref}>
            {resolvedHref}
          </span>
        )}

        {item.target === "_blank" && (
          <ExternalLink className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
        )}

        <Badge variant="secondary" className="bg-muted/50 text-muted-foreground text-[10px] px-1.5 py-0">
          {getItemTypeLabel(item.type)}
        </Badge>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {depth < MAX_DEPTH - 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddChild(item.id)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
              title="Add child item"
              data-testid={`add-child-${item.id}`}
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}
          {depth > 0 && canMoveUp && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMoveToParent(item.id)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
              title="Move to parent level"
              data-testid={`move-up-${item.id}`}
            >
              <CornerDownRight className="w-3 h-3 rotate-180" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            data-testid={`edit-item-${item.id}`}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
            data-testid={`remove-item-${item.id}`}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddItemModal({
  open,
  onClose,
  onAdd,
  parentLabel,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: MenuItemData) => void;
  parentLabel?: string;
}) {
  const [type, setType] = useState<"page" | "post" | "external" | "label">("page");
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [target, setTarget] = useState<"_self" | "_blank">("_self");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPageSlug, setSelectedPageSlug] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostSlug, setSelectedPostSlug] = useState<string | null>(null);

  const { data: pages = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/cms/pages"],
    queryFn: () => apiRequest("GET", "/api/admin/cms/pages").then((r) => r.json()),
    enabled: type === "page",
  });

  const { data: posts = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/cms/posts"],
    queryFn: () => apiRequest("GET", "/api/admin/cms/posts").then((r) => r.json()),
    enabled: type === "post",
  });

  const filteredPages = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const cmsPages = searchQuery
      ? pages.filter((p: any) => p.title?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q))
      : pages;
    const systemPages = searchQuery
      ? SYSTEM_PAGES.filter((p) => p.title.toLowerCase().includes(q) || p.path.toLowerCase().includes(q))
      : SYSTEM_PAGES;
    return { cmsPages, systemPages };
  }, [pages, searchQuery]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter((p: any) => p.title?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q));
  }, [posts, searchQuery]);

  function reset() {
    setType("page");
    setLabel("");
    setHref("");
    setTarget("_self");
    setSearchQuery("");
    setSelectedPageId(null);
    setSelectedPageSlug(null);
    setSelectedPostId(null);
    setSelectedPostSlug(null);
  }

  function handleAdd() {
    const isSystemPage = type === "page" && selectedPageId?.startsWith("system-");
    const systemPage = isSystemPage ? SYSTEM_PAGES.find((p) => p.id === selectedPageId) : null;

    const newItem: MenuItemData = {
      id: generateId(),
      type,
      label: label || "(untitled)",
      href: type === "external" ? href : isSystemPage ? (systemPage?.path || "/") : type === "page" ? `/page/${selectedPageSlug || ""}` : type === "post" ? `/blog/${selectedPostSlug || ""}` : "",
      url: type === "external" ? href : isSystemPage ? (systemPage?.path || "/") : type === "page" ? `/page/${selectedPageSlug || ""}` : "",
      pageId: type === "page" && !isSystemPage ? selectedPageId || undefined : undefined,
      pageSlug: type === "page" ? selectedPageSlug || undefined : undefined,
      postId: type === "post" ? selectedPostId || undefined : undefined,
      postSlug: type === "post" ? selectedPostSlug || undefined : undefined,
      target,
      order: 0,
      children: [],
    };
    onAdd(newItem);
    reset();
    onClose();
  }

  const canSave = label && (
    type === "label" ||
    type === "external" && href ||
    type === "page" && selectedPageId ||
    type === "post" && selectedPostId
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-add-item-title">Add Menu Item</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {parentLabel ? `Adding as child of "${parentLabel}"` : "Add a new navigation item"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-foreground/80 text-sm">Item Type</Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {(["page", "post", "external", "label"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setType(t); setSearchQuery(""); setSelectedPageId(null); setSelectedPostId(null); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-all ${
                    type === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground hover:border-border"
                  }`}
                  data-testid={`type-button-${t}`}
                >
                  {getItemTypeIcon(t)}
                  <span>{getItemTypeLabel(t)}</span>
                </button>
              ))}
            </div>
          </div>

          {type === "page" && (
            <div>
              <Label className="text-foreground/80 text-sm">Select Page</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-muted border-border text-foreground pl-9"
                  data-testid="input-search-pages"
                />
              </div>
              <div className="mt-2 max-h-60 overflow-y-auto space-y-0.5 border border-border rounded-md p-1" data-testid="page-list">
                {filteredPages.systemPages.length === 0 && filteredPages.cmsPages.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">No pages found</p>
                ) : (
                  <>
                    {filteredPages.systemPages.length > 0 && (
                      <>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-3 pt-2 pb-1 flex items-center gap-1.5">
                          <Layout className="w-3 h-3" />
                          System Pages
                        </p>
                        {filteredPages.systemPages.map((page) => (
                          <button
                            key={page.id}
                            onClick={() => {
                              setSelectedPageId(page.id);
                              setSelectedPageSlug(page.slug);
                              if (!label) setLabel(page.title);
                            }}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                              selectedPageId === page.id
                                ? "bg-primary/15 text-primary"
                                : "text-foreground/80 hover:bg-muted"
                            }`}
                            data-testid={`select-page-${page.id}`}
                          >
                            <span className="truncate">{page.title}</span>
                            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{page.path}</span>
                          </button>
                        ))}
                      </>
                    )}
                    {filteredPages.cmsPages.length > 0 && (
                      <>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-3 pt-2 pb-1 flex items-center gap-1.5">
                          <FileText className="w-3 h-3" />
                          CMS Pages
                        </p>
                        {filteredPages.cmsPages.map((page: any) => (
                          <button
                            key={page.id}
                            onClick={() => {
                              setSelectedPageId(page.id);
                              setSelectedPageSlug(page.slug);
                              if (!label) setLabel(page.title);
                            }}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                              selectedPageId === page.id
                                ? "bg-primary/15 text-primary"
                                : "text-foreground/80 hover:bg-muted"
                            }`}
                            data-testid={`select-page-${page.id}`}
                          >
                            <span className="truncate">{page.title}</span>
                            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">/{page.slug}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {type === "post" && (
            <div>
              <Label className="text-foreground/80 text-sm">Select Post</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-muted border-border text-foreground pl-9"
                  data-testid="input-search-posts"
                />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1 border border-border rounded-md p-1" data-testid="post-list">
                {filteredPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">No posts found</p>
                ) : (
                  filteredPosts.map((post: any) => (
                    <button
                      key={post.id}
                      onClick={() => {
                        setSelectedPostId(post.id);
                        setSelectedPostSlug(post.slug);
                        if (!label) setLabel(post.title);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                        selectedPostId === post.id
                          ? "bg-primary/15 text-primary"
                          : "text-foreground/80 hover:bg-muted"
                      }`}
                      data-testid={`select-post-${post.id}`}
                    >
                      <span className="truncate">{post.title}</span>
                      <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground ml-2">
                        {post.status || "draft"}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {type === "external" && (
            <div>
              <Label className="text-foreground/80 text-sm">URL</Label>
              <Input
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder="https://example.com"
                className="bg-muted border-border text-foreground mt-1.5"
                data-testid="input-external-url"
              />
            </div>
          )}

          <div>
            <Label className="text-foreground/80 text-sm">Label *</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Menu item label"
              className="bg-muted border-border text-foreground mt-1.5"
              data-testid="input-item-label"
            />
          </div>

          {type !== "label" && (
            <div>
              <Label className="text-foreground/80 text-sm">Open in</Label>
              <Select value={target} onValueChange={(v) => setTarget(v as "_self" | "_blank")}>
                <SelectTrigger className="bg-muted border-border text-foreground mt-1.5" data-testid="select-item-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border text-foreground">
                  <SelectItem value="_self">Same tab</SelectItem>
                  <SelectItem value="_blank">New tab</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }} data-testid="button-cancel-add-item">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!canSave}
            className="bg-primary"
            data-testid="button-confirm-add-item"
          >
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MenuEditor({
  menu,
  onBack,
}: {
  menu: MenuData | null;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState(menu?.name || "");
  const [location, setLocation] = useState(menu?.location || "main");
  const [active, setActive] = useState(menu?.active ?? true);
  const [items, setItems] = useState<MenuItemData[]>(
    (menu?.items || []).map((item, i) => normalizeItem(item, i))
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    function walk(list: MenuItemData[]) {
      for (const item of list) {
        if (item.children?.length) {
          ids.add(item.id);
          walk(item.children);
        }
      }
    }
    walk(menu?.items || []);
    return ids;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  function normalizeItem(item: any, i: number): MenuItemData {
    return {
      id: item.id || generateId(),
      type: item.type || "external",
      label: item.label || "",
      href: item.href || item.url || "",
      url: item.url || item.href || "",
      pageId: item.pageId,
      pageSlug: item.pageSlug,
      postId: item.postId,
      postSlug: item.postSlug,
      target: item.target || "_self",
      order: item.order ?? i,
      children: (item.children || []).map((c: any, j: number) => normalizeItem(c, j)),
    };
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = { name, location, active, items: items.map((item, i) => serializeItem(item, i)) };
      if (menu) {
        return apiRequest("PUT", `/api/admin/cms/menus/${menu.id}`, data).then((r) => r.json());
      }
      return apiRequest("POST", `/api/admin/cms/menus`, data).then((r) => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/menus"] });
      toast({ title: menu ? "Menu updated" : "Menu created" });
      setHasChanges(false);
      onBack();
    },
    onError: () => toast({ title: "Failed to save menu", variant: "destructive" }),
  });

  function serializeItem(item: MenuItemData, i: number): any {
    return {
      id: item.id,
      type: item.type,
      label: item.label,
      href: item.href || item.url || "",
      url: item.url || item.href || "",
      pageId: item.pageId,
      pageSlug: item.pageSlug,
      postId: item.postId,
      postSlug: item.postSlug,
      target: item.target,
      order: i,
      children: (item.children || []).map((c, j) => serializeItem(c, j)),
    };
  }

  const flatItems = useMemo(() => {
    const result: { item: MenuItemData; depth: number }[] = [];
    function walk(list: MenuItemData[], depth: number) {
      for (const item of list) {
        result.push({ item, depth });
        if (item.children?.length && expandedIds.has(item.id)) {
          walk(item.children, depth + 1);
        }
      }
    }
    walk(items, 0);
    return result;
  }, [items, expandedIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function findAndRemoveItem(list: MenuItemData[], id: string): { remaining: MenuItemData[]; removed?: MenuItemData } {
    const result: MenuItemData[] = [];
    let removed: MenuItemData | undefined;
    for (const item of list) {
      if (item.id === id) {
        removed = item;
      } else {
        const childResult = findAndRemoveItem(item.children || [], id);
        result.push({ ...item, children: childResult.remaining });
        if (childResult.removed) removed = childResult.removed;
      }
    }
    return { remaining: result, removed };
  }

  function findItemDepth(list: MenuItemData[], id: string, depth: number = 0): number {
    for (const item of list) {
      if (item.id === id) return depth;
      if (item.children?.length) {
        const d = findItemDepth(item.children, id, depth + 1);
        if (d >= 0) return d;
      }
    }
    return -1;
  }

  function insertItemAtIndex(list: MenuItemData[], targetId: string, newItem: MenuItemData): MenuItemData[] {
    const result: MenuItemData[] = [];
    for (const item of list) {
      if (item.id === targetId) {
        result.push(newItem);
        result.push(item);
      } else {
        result.push({
          ...item,
          children: insertItemAtIndex(item.children || [], targetId, newItem),
        });
      }
    }
    return result;
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const activeDepth = findItemDepth(prev, active.id as string);
      const overDepth = findItemDepth(prev, over.id as string);

      if (activeDepth === overDepth && activeDepth === 0) {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        if (oldIndex >= 0 && newIndex >= 0) {
          return arrayMove(prev, oldIndex, newIndex);
        }
      }

      function reorderInParent(list: MenuItemData[]): MenuItemData[] {
        const activeIdx = list.findIndex((i) => i.id === active.id);
        const overIdx = list.findIndex((i) => i.id === over!.id);
        if (activeIdx >= 0 && overIdx >= 0) {
          return arrayMove(list, activeIdx, overIdx);
        }
        return list.map((item) => ({
          ...item,
          children: reorderInParent(item.children || []),
        }));
      }

      return reorderInParent(prev);
    });
    setHasChanges(true);
  }, []);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addItemToParent(parentId: string | null, item: MenuItemData) {
    if (!parentId) {
      setItems((prev) => [...prev, item]);
    } else {
      setItems((prev) => {
        function addChild(list: MenuItemData[]): MenuItemData[] {
          return list.map((i) => {
            if (i.id === parentId) {
              return { ...i, children: [...(i.children || []), item] };
            }
            return { ...i, children: addChild(i.children || []) };
          });
        }
        return addChild(prev);
      });
      setExpandedIds((prev) => new Set([...prev, parentId]));
    }
    setHasChanges(true);
  }

  function removeItem(id: string) {
    setItems((prev) => findAndRemoveItem(prev, id).remaining);
    setHasChanges(true);
  }

  function moveToParent(id: string) {
    setItems((prev) => {
      function moveUp(list: MenuItemData[], parentList: MenuItemData[] | null): { result: MenuItemData[]; movedItem?: MenuItemData } {
        for (let i = 0; i < list.length; i++) {
          const childIdx = (list[i].children || []).findIndex((c) => c.id === id);
          if (childIdx >= 0) {
            const movedItem = list[i].children![childIdx];
            const newChildren = list[i].children!.filter((_, j) => j !== childIdx);
            const newList = [...list];
            newList[i] = { ...newList[i], children: newChildren };
            newList.splice(i + 1, 0, movedItem);
            return { result: newList, movedItem };
          }
          const childResult = moveUp(list[i].children || [], list);
          if (childResult.movedItem) {
            const newList = [...list];
            newList[i] = { ...newList[i], children: childResult.result };
            return { result: newList, movedItem: childResult.movedItem };
          }
        }
        return { result: list };
      }
      return moveUp(prev, null).result;
    });
    setHasChanges(true);
  }

  function updateEditingItem(updates: Partial<MenuItemData>) {
    if (!editingItem) return;
    setEditingItem({ ...editingItem, ...updates });
  }

  function saveEditingItem() {
    if (!editingItem) return;
    setItems((prev) => {
      function updateInTree(list: MenuItemData[]): MenuItemData[] {
        return list.map((item) => {
          if (item.id === editingItem!.id) return { ...editingItem! };
          return { ...item, children: updateInTree(item.children || []) };
        });
      }
      return updateInTree(prev);
    });
    setEditingItem(null);
    setHasChanges(true);
  }

  const addParentItem = addParentId
    ? flatItems.find((fi) => fi.item.id === addParentId)?.item
    : null;

  const locationLabels: Record<string, string> = {
    main: "Main Navigation",
    footer: "Footer",
    utility: "Utility Bar",
    header: "Header",
    sidebar: "Sidebar",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground" data-testid="button-back-to-menus">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-editor-title">
              {menu ? "Edit Menu" : "New Menu"}
            </h1>
            {menu && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {locationLabels[menu.location] || menu.location} &middot; {(menu.items || []).length} items
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="bg-yellow-900/30 text-yellow-400 text-xs">Unsaved</Badge>
          )}
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!name || saveMutation.isPending}
            className="bg-primary gap-2"
            data-testid="button-save-menu"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving..." : "Save Menu"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-border lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground/80">Menu Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">Name *</Label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setHasChanges(true); }}
                placeholder="Main Navigation"
                className="bg-muted border-border text-foreground mt-1"
                data-testid="input-menu-name"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Location</Label>
              <Select value={location} onValueChange={(v) => { setLocation(v); setHasChanges(true); }}>
                <SelectTrigger className="bg-muted border-border text-foreground mt-1" data-testid="select-menu-location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-muted border-border text-foreground">
                  <SelectItem value="main">Main Navigation</SelectItem>
                  <SelectItem value="footer">Footer</SelectItem>
                  <SelectItem value="utility">Utility Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label className="text-muted-foreground text-xs">Active</Label>
              <Switch
                checked={active}
                onCheckedChange={(v) => { setActive(v); setHasChanges(true); }}
                data-testid="switch-menu-active"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground/80">
                Menu Items ({items.length})
              </CardTitle>
              <Button
                onClick={() => { setAddParentId(null); setShowAddModal(true); }}
                size="sm"
                className="bg-primary gap-1.5 h-7 text-xs"
                data-testid="button-add-item"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {flatItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-no-items">
                <Menu className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No menu items yet</p>
                <p className="text-xs mt-1 text-muted-foreground/60">Click "Add Item" to start building your menu</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={flatItems.map((fi) => fi.item.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1" data-testid="menu-items-list">
                    {flatItems.map(({ item, depth }) => (
                      <SortableMenuItem
                        key={item.id}
                        item={item}
                        depth={depth}
                        onEdit={setEditingItem}
                        onRemove={removeItem}
                        onToggleChildren={toggleExpanded}
                        expandedIds={expandedIds}
                        onAddChild={(parentId) => { setAddParentId(parentId); setShowAddModal(true); }}
                        onMoveToParent={moveToParent}
                        canMoveUp={true}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      <AddItemModal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setAddParentId(null); }}
        onAdd={(item) => addItemToParent(addParentId, item)}
        parentLabel={addParentItem?.label}
      />

      <Dialog open={!!editingItem} onOpenChange={(o) => { if (!o) setEditingItem(null); }}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription className="text-muted-foreground">Update this menu item's properties</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-foreground/80 text-sm">Type</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  {getItemTypeIcon(editingItem.type)}
                  <span className="text-sm text-foreground/80">{getItemTypeLabel(editingItem.type)}</span>
                </div>
              </div>
              <div>
                <Label className="text-foreground/80 text-sm">Label *</Label>
                <Input
                  value={editingItem.label}
                  onChange={(e) => updateEditingItem({ label: e.target.value })}
                  className="bg-muted border-border text-foreground mt-1.5"
                  data-testid="input-edit-label"
                />
              </div>
              {editingItem.type === "external" && (
                <div>
                  <Label className="text-foreground/80 text-sm">URL</Label>
                  <Input
                    value={editingItem.href || editingItem.url}
                    onChange={(e) => updateEditingItem({ href: e.target.value, url: e.target.value })}
                    placeholder="https://..."
                    className="bg-muted border-border text-foreground mt-1.5"
                    data-testid="input-edit-url"
                  />
                </div>
              )}
              {editingItem.type === "page" && (
                <div>
                  <Label className="text-foreground/80 text-sm">Destination</Label>
                  <p className="text-sm text-muted-foreground mt-1.5 bg-muted rounded px-3 py-2 border border-border">
                    {editingItem.pageSlug
                      ? ({"home": "/", "shop": "/shop", "blog": "/blog", "my-account": "/my-account", "track-order": "/track-order", "checkout": "/checkout", "login": "/login", "register": "/register", "become-affiliate": "/become-affiliate", "affiliate-portal": "/affiliate-portal"}[editingItem.pageSlug] || `/page/${editingItem.pageSlug}`)
                      : (editingItem.href || "/")}
                  </p>
                </div>
              )}
              {editingItem.type !== "label" && (
                <div>
                  <Label className="text-foreground/80 text-sm">Open in</Label>
                  <Select value={editingItem.target} onValueChange={(v) => updateEditingItem({ target: v as "_self" | "_blank" })}>
                    <SelectTrigger className="bg-muted border-border text-foreground mt-1.5" data-testid="select-edit-target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border text-foreground">
                      <SelectItem value="_self">Same tab</SelectItem>
                      <SelectItem value="_blank">New tab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button
              onClick={saveEditingItem}
              className="bg-primary"
              data-testid="button-save-edit-item"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminCmsMenus() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingMenu, setEditingMenu] = useState<MenuData | null | "new">(null);

  const { data: menus = [], isLoading } = useQuery<MenuData[]>({
    queryKey: ["/api/admin/cms/menus"],
    queryFn: () => apiRequest("GET", "/api/admin/cms/menus").then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/cms/menus/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/menus"] });
      toast({ title: "Menu deleted" });
    },
  });

  if (adminLoading || isLoading) {
    return (
      <CmsLayout activeNav="menus" breadcrumbs={[{ label: "Menus" }]}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </CmsLayout>
    );
  }

  if (!hasFullAccess) {
    return (
      <CmsLayout activeNav="menus" breadcrumbs={[{ label: "Menus" }]}>
        <div className="text-center py-20 text-muted-foreground" data-testid="text-access-denied">Access Denied</div>
      </CmsLayout>
    );
  }

  if (editingMenu !== null) {
    return (
      <CmsLayout activeNav="menus" breadcrumbs={[{ label: "Menus", href: "/admin/cms/menus" }, { label: editingMenu === "new" ? "New Menu" : "Edit" }]}>
        <MenuEditor
          menu={editingMenu === "new" ? null : editingMenu}
          onBack={() => {
            setEditingMenu(null);
            queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/menus"] });
          }}
        />
      </CmsLayout>
    );
  }

  const locationLabels: Record<string, string> = {
    main: "Main",
    footer: "Footer",
    utility: "Utility",
    header: "Header",
    sidebar: "Sidebar",
  };

  return (
    <CmsLayout activeNav="menus" breadcrumbs={[{ label: "Menus" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-menus-title">Navigation Menus</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your site navigation for main, footer, and utility areas</p>
          </div>
          <Button
            onClick={() => setEditingMenu("new")}
            className="bg-primary gap-2"
            data-testid="button-create-menu"
          >
            <Plus className="w-4 h-4" />
            New Menu
          </Button>
        </div>

        {menus.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground" data-testid="text-no-menus">
            <Menu className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="mb-2">No navigation menus yet</p>
            <p className="text-xs text-muted-foreground/60 mb-4">Create a menu to control site navigation</p>
            <Button onClick={() => setEditingMenu("new")} className="bg-primary gap-2" data-testid="button-create-first-menu">
              <Plus className="w-4 h-4" />
              Create Your First Menu
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {menus.map((menu) => (
              <Card key={menu.id} className="bg-card border-border hover:border-border transition-colors cursor-pointer" data-testid={`card-menu-${menu.id}`}
                onClick={() => setEditingMenu(menu)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-foreground" data-testid={`text-menu-name-${menu.id}`}>
                      {menu.name}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="secondary"
                        className="bg-muted text-foreground/80 text-xs"
                        data-testid={`badge-menu-location-${menu.id}`}
                      >
                        {locationLabels[menu.location] || menu.location}
                      </Badge>
                      {!menu.active && (
                        <Badge variant="secondary" className="bg-yellow-900/30 text-yellow-400 text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-muted-foreground mb-3">
                    {(menu.items || []).length} item{(menu.items || []).length !== 1 ? "s" : ""}
                  </div>
                  {(menu.items || []).length > 0 && (
                    <div className="space-y-1 mb-3">
                      {(menu.items as MenuItemData[]).slice(0, 5).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          {getItemTypeIcon(item.type || "external")}
                          <span className="truncate">{item.label}</span>
                          {(item.children || []).length > 0 && (
                            <span className="text-muted-foreground/60">({item.children.length})</span>
                          )}
                        </div>
                      ))}
                      {(menu.items as MenuItemData[]).length > 5 && (
                        <span className="text-xs text-muted-foreground/60">+{menu.items.length - 5} more</span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingMenu(menu)}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted gap-2 h-9 px-4 text-xs font-medium border-border"
                      data-testid={`button-edit-menu-${menu.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm("Delete this menu? This will remove it from your site navigation.")) {
                          deleteMutation.mutate(menu.id);
                        }
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 gap-2 h-9 px-4 text-xs font-medium border-border hover:border-red-400/50"
                      data-testid={`button-delete-menu-${menu.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CmsLayout>
  );
}
