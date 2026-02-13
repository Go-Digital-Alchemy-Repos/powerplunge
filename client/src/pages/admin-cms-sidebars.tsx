import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CmsLayout from "@/components/admin/CmsLayout";
import { useAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
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
  Plus,
  Trash2,
  GripVertical,
  PanelRight,
  Mail,
  FileText,
  Search,
  ChevronRight,
  Pencil,
  X,
  Save,
  LayoutList,
  Package,
} from "lucide-react";

interface Sidebar {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const LOCATION_OPTIONS = [
  { value: "__none__", label: "No location (general)" },
  { value: "post_left", label: "Blog Posts — Left Sidebar" },
  { value: "page_left", label: "Pages — Left Sidebar" },
] as const;

function locationLabel(loc: string | null): string {
  return LOCATION_OPTIONS.find((o) => o.value === (loc || "__none__"))?.label || "No location";
}

interface SidebarWidget {
  id: string;
  sidebarId: string;
  widgetType: string;
  title: string;
  settings: Record<string, any>;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WidgetTemplate {
  type: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  settingsFields: { key: string; label: string; type: string; options?: { label: string; value: string }[]; defaultValue?: any; placeholder?: string }[];
  defaultSettings: Record<string, any>;
}

interface SidebarWithWidgets extends Sidebar {
  widgets: SidebarWidget[];
}

const ICON_MAP: Record<string, any> = {
  Mail,
  FileText,
  Search,
};

function getWidgetIcon(iconName: string) {
  return ICON_MAP[iconName] || Package;
}

function apiRequest(url: string, options?: RequestInit) {
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  }).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return r.json();
  });
}

function CreateSidebarForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<string>("__none__");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/cms/sidebars", {
        method: "POST",
        body: JSON.stringify({
          name,
          slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: description || undefined,
          location: location === "__none__" ? null : location,
        }),
      }),
    onSuccess: () => {
      toast({ title: "Sidebar created" });
      setName("");
      setSlug("");
      setDescription("");
      setLocation("__none__");
      onCreated();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-3 p-4 border border-border rounded-lg bg-card" data-testid="form-create-sidebar">
      <h3 className="text-sm font-semibold text-foreground">Create New Sidebar</h3>
      <Input
        placeholder="Sidebar name (e.g. Blog Sidebar)"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
        }}
        data-testid="input-sidebar-name"
      />
      <Input
        placeholder="Slug (auto-generated)"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        data-testid="input-sidebar-slug"
      />
      <Input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        data-testid="input-sidebar-description"
      />
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Display Location</label>
        <select
          className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          data-testid="select-sidebar-location"
        >
          {LOCATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <Button
        size="sm"
        disabled={!name || createMutation.isPending}
        onClick={() => createMutation.mutate()}
        data-testid="button-create-sidebar"
      >
        <Plus className="w-4 h-4 mr-1" /> Create Sidebar
      </Button>
    </div>
  );
}

function WidgetSettingsEditor({
  widget,
  template,
  onSave,
  onCancel,
}: {
  widget: SidebarWidget;
  template: WidgetTemplate | undefined;
  onSave: (settings: Record<string, any>, title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(widget.title);
  const [settings, setSettings] = useState<Record<string, any>>({ ...widget.settings });

  const fields = template?.settingsFields || [];

  return (
    <div className="p-4 border border-primary/30 rounded-lg bg-card space-y-3" data-testid="widget-settings-editor">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Edit Widget Settings</h4>
        <Button variant="ghost" size="sm" onClick={onCancel} data-testid="button-cancel-widget-edit">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Widget Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-widget-title" />
      </div>
      {fields.map((field) => (
        <div key={field.key}>
          <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
          {field.type === "text" && (
            <Input
              value={settings[field.key] ?? ""}
              onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              data-testid={`input-widget-${field.key}`}
            />
          )}
          {field.type === "textarea" && (
            <textarea
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none"
              rows={3}
              value={settings[field.key] ?? ""}
              onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
              data-testid={`input-widget-${field.key}`}
            />
          )}
          {field.type === "number" && (
            <Input
              type="number"
              value={settings[field.key] ?? ""}
              onChange={(e) => setSettings({ ...settings, [field.key]: parseInt(e.target.value) || 0 })}
              data-testid={`input-widget-${field.key}`}
            />
          )}
          {field.type === "checkbox" && (
            <div className="flex items-center gap-2">
              <Switch
                checked={!!settings[field.key]}
                onCheckedChange={(checked) => setSettings({ ...settings, [field.key]: checked })}
                data-testid={`switch-widget-${field.key}`}
              />
              <span className="text-xs text-muted-foreground">{settings[field.key] ? "Enabled" : "Disabled"}</span>
            </div>
          )}
          {field.type === "select" && field.options && (
            <select
              className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground"
              value={settings[field.key] ?? ""}
              onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
              data-testid={`select-widget-${field.key}`}
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
      ))}
      <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => onSave(settings, title)} data-testid="button-save-widget-settings">
        <Save className="w-4 h-4 mr-1" /> Save
      </Button>
    </div>
  );
}

function SortableWidget({
  widget,
  template,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  widget: SidebarWidget;
  template?: WidgetTemplate;
  onToggleActive: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = getWidgetIcon(template?.icon || "Package");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border border-border rounded-lg bg-card group hover:border-border transition-colors select-none ${
        isDragging ? "shadow-lg ring-1 ring-primary/30 z-10" : ""
      }`}
      data-testid={`widget-item-${widget.id}`}
    >
      <button
        className="text-muted-foreground/60 hover:text-muted-foreground cursor-grab active:cursor-grabbing p-0.5 touch-none"
        {...attributes}
        {...listeners}
        data-testid={`drag-handle-${widget.id}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="p-2 rounded-lg bg-muted">
        <Icon className="w-4 h-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate" data-testid={`text-widget-title-${widget.id}`}>
          {widget.title}
        </p>
        <p className="text-xs text-muted-foreground">{template?.label || widget.widgetType}</p>
      </div>

      <Switch
        checked={widget.isActive}
        onCheckedChange={onToggleActive}
        data-testid={`switch-widget-active-${widget.id}`}
      />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onEdit}
        data-testid={`button-edit-widget-${widget.id}`}
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        onClick={onDelete}
        data-testid={`button-delete-widget-${widget.id}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function SidebarDetail({
  sidebar,
  templates,
  onBack,
}: {
  sidebar: Sidebar;
  templates: WidgetTemplate[];
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(sidebar.name);
  const [editDesc, setEditDesc] = useState(sidebar.description || "");
  const [editLocation, setEditLocation] = useState<string>(sidebar.location || "__none__");

  const { data: sidebarData, isLoading } = useQuery<SidebarWithWidgets>({
    queryKey: [`/api/admin/cms/sidebars/${sidebar.id}`],
  });

  const widgets = sidebarData?.widgets || [];

  const addWidgetMutation = useMutation({
    mutationFn: (tmpl: WidgetTemplate) =>
      apiRequest(`/api/admin/cms/sidebars/${sidebar.id}/widgets`, {
        method: "POST",
        body: JSON.stringify({
          widgetType: tmpl.type,
          title: tmpl.label,
          settings: tmpl.defaultSettings,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/admin/cms/sidebars/${sidebar.id}`] });
      toast({ title: "Widget added" });
      setShowAddWidget(false);
    },
  });

  const updateWidgetMutation = useMutation({
    mutationFn: ({ widgetId, data }: { widgetId: string; data: any }) =>
      apiRequest(`/api/admin/cms/sidebars/${sidebar.id}/widgets/${widgetId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/admin/cms/sidebars/${sidebar.id}`] });
      setEditingWidgetId(null);
      toast({ title: "Widget updated" });
    },
  });

  const deleteWidgetMutation = useMutation({
    mutationFn: (widgetId: string) =>
      apiRequest(`/api/admin/cms/sidebars/${sidebar.id}/widgets/${widgetId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/admin/cms/sidebars/${sidebar.id}`] });
      toast({ title: "Widget removed" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (widgetIds: string[]) =>
      apiRequest(`/api/admin/cms/sidebars/${sidebar.id}/widgets-reorder`, {
        method: "PUT",
        body: JSON.stringify({ widgetIds }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/admin/cms/sidebars/${sidebar.id}`] });
    },
  });

  const updateSidebarMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(`/api/admin/cms/sidebars/${sidebar.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/cms/sidebars"] });
      qc.invalidateQueries({ queryKey: [`/api/admin/cms/sidebars/${sidebar.id}`] });
      setIsEditing(false);
      toast({ title: "Sidebar updated" });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgets.findIndex((w) => w.id === active.id);
    const newIndex = widgets.findIndex((w) => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(widgets, oldIndex, newIndex);
    reorderMutation.mutate(reordered.map((w) => w.id));
  };

  return (
    <div className="space-y-6" data-testid="sidebar-detail">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-sidebars">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </Button>
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="max-w-xs"
              data-testid="input-edit-sidebar-name"
            />
            <select
              className="bg-muted border border-border rounded-md px-2 py-1.5 text-xs text-foreground max-w-[200px]"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              data-testid="select-edit-sidebar-location"
            >
              {LOCATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => updateSidebarMutation.mutate({ name: editName, description: editDesc, location: editLocation === "__none__" ? null : editLocation, slug: sidebar.slug, isActive: sidebar.isActive })}
              data-testid="button-save-sidebar"
            >
              <Save className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} data-testid="button-cancel-sidebar-edit">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground" data-testid="text-sidebar-name">{sidebar.name}</h2>
              {sidebar.description && <p className="text-sm text-muted-foreground">{sidebar.description}</p>}
            </div>
            <Badge variant="outline" className="text-xs" data-testid="badge-sidebar-slug">{sidebar.slug}</Badge>
            {sidebar.location && (
              <Badge variant="outline" className="text-[10px] text-primary border-primary/30" data-testid="badge-sidebar-detail-location">
                {locationLabel(sidebar.location)}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} data-testid="button-edit-sidebar">
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <LayoutList className="w-4 h-4" /> Widgets ({widgets.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowAddWidget(true)} data-testid="button-add-widget">
          <Plus className="w-4 h-4 mr-1" /> Add Widget
        </Button>
      </div>

      {showAddWidget && (
        <Card className="bg-card border-border" data-testid="widget-template-gallery">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Widget Templates</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddWidget(false)} data-testid="button-close-widget-gallery">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {templates.map((tmpl) => {
                const Icon = getWidgetIcon(tmpl.icon);
                return (
                  <div
                    key={tmpl.type}
                    className="p-4 border border-border rounded-lg hover:border-primary/50 cursor-pointer transition-colors group"
                    onClick={() => addWidgetMutation.mutate(tmpl)}
                    data-testid={`widget-template-${tmpl.type}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{tmpl.label}</p>
                        <Badge variant="outline" className="text-[10px]">{tmpl.category}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {!isLoading && widgets.length === 0 && (
        <div className="text-center py-10 text-muted-foreground" data-testid="text-no-widgets">
          <PanelRight className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No widgets yet. Click "Add Widget" to get started.</p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2" data-testid="widget-list">
            {widgets.map((widget) => {
              const tmpl = templates.find((t) => t.type === widget.widgetType);

              if (editingWidgetId === widget.id) {
                return (
                  <WidgetSettingsEditor
                    key={widget.id}
                    widget={widget}
                    template={tmpl}
                    onSave={(settings, title) =>
                      updateWidgetMutation.mutate({ widgetId: widget.id, data: { settings, title } })
                    }
                    onCancel={() => setEditingWidgetId(null)}
                  />
                );
              }

              return (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  template={tmpl}
                  onToggleActive={(checked) =>
                    updateWidgetMutation.mutate({ widgetId: widget.id, data: { isActive: checked } })
                  }
                  onEdit={() => setEditingWidgetId(widget.id)}
                  onDelete={() => deleteWidgetMutation.mutate(widget.id)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export function SidebarsContent({ embedded = false }: { embedded?: boolean }) {
  const { hasFullAccess } = useAdmin();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedSidebarId, setSelectedSidebarId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: sidebarList = [], isLoading: sidebarsLoading } = useQuery<Sidebar[]>({
    queryKey: ["/api/admin/cms/sidebars"],
    enabled: hasFullAccess,
  });

  const { data: widgetTemplates = [] } = useQuery<WidgetTemplate[]>({
    queryKey: ["/api/admin/cms/sidebars/widget-templates/list"],
    enabled: hasFullAccess,
  });

  const deleteSidebarMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/cms/sidebars/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/cms/sidebars"] });
      setSelectedSidebarId(null);
      toast({ title: "Sidebar deleted" });
    },
  });

  const selectedSidebar = sidebarList.find((s) => s.id === selectedSidebarId);

  return (
    <div className={embedded ? "" : "max-w-4xl mx-auto"} data-testid="admin-cms-sidebars-page">
      {selectedSidebar ? (
        <SidebarDetail
          sidebar={selectedSidebar}
          templates={widgetTemplates}
          onBack={() => setSelectedSidebarId(null)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              {!embedded && <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Sidebars & Widgets</h1>}
              <p className="text-sm text-muted-foreground mt-0.5">Create and manage sidebars with reusable widget templates</p>
            </div>
            <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)} data-testid="button-toggle-create-form">
              <Plus className="w-4 h-4 mr-1" /> New Sidebar
            </Button>
          </div>

          {showCreateForm && (
            <div className="mb-6">
              <CreateSidebarForm
                onCreated={() => {
                  qc.invalidateQueries({ queryKey: ["/api/admin/cms/sidebars"] });
                  setShowCreateForm(false);
                }}
              />
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <PanelRight className="w-4 h-4" /> Your Sidebars
            </h2>
            {sidebarsLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
            {!sidebarsLoading && sidebarList.length === 0 && (
              <div className="text-center py-10 border border-dashed border-border rounded-lg" data-testid="text-no-sidebars">
                <PanelRight className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No sidebars yet. Create one to get started.</p>
              </div>
            )}
            <div className="space-y-2" data-testid="sidebar-list">
              {sidebarList.map((sb) => (
                <div
                  key={sb.id}
                  className="flex items-center gap-4 p-4 border border-border rounded-lg bg-card hover:border-border cursor-pointer transition-colors group"
                  onClick={() => setSelectedSidebarId(sb.id)}
                  data-testid={`sidebar-item-${sb.id}`}
                >
                  <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <PanelRight className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground" data-testid={`text-sidebar-name-${sb.id}`}>{sb.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{sb.description || sb.slug}</p>
                  </div>
                  {sb.location && (
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30" data-testid={`badge-sidebar-location-${sb.id}`}>
                      {locationLabel(sb.location)}
                    </Badge>
                  )}
                  <Badge variant={sb.isActive ? "default" : "secondary"} className="text-xs" data-testid={`badge-sidebar-status-${sb.id}`}>
                    {sb.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this sidebar and all its widgets?")) {
                        deleteSidebarMutation.mutate(sb.id);
                      }
                    }}
                    data-testid={`button-delete-sidebar-${sb.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" /> Available Widget Templates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="widget-templates-section">
              {widgetTemplates.map((tmpl) => {
                const Icon = getWidgetIcon(tmpl.icon);
                return (
                  <Card key={tmpl.type} className="bg-card border-border" data-testid={`widget-template-preview-${tmpl.type}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{tmpl.label}</p>
                          <Badge variant="outline" className="text-[10px]">{tmpl.category}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminCmsSidebars() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();

  if (adminLoading || !hasFullAccess) {
    return (
      <CmsLayout activeNav="sidebars" breadcrumbs={[{ label: "Sidebars & Widgets" }]}>
        <div className="p-8 text-center text-muted-foreground">{adminLoading ? "Loading..." : "Access Denied"}</div>
      </CmsLayout>
    );
  }

  return (
    <CmsLayout activeNav="sidebars" breadcrumbs={[{ label: "Sidebars & Widgets" }]}>
      <SidebarsContent />
    </CmsLayout>
  );
}
