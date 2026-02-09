import { useState, useEffect, useMemo } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import CmsV2Layout from "@/components/admin/CmsV2Layout";
import {
  ArrowLeft, Save, Globe, GlobeLock, Clock, Blocks, Calendar, History,
  Plus, X, Search as SearchIcon, Archive,
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

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminCmsV2PostEditor() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [matchEdit, paramsEdit] = useRoute("/admin/cms-v2/posts/:id/edit");
  const [matchNew] = useRoute("/admin/cms-v2/posts/new");
  const isNew = matchNew;
  const postId = paramsEdit?.id;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [legacyHtml, setLegacyHtml] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [ogImageId, setOgImageId] = useState("");
  const [allowIndex, setAllowIndex] = useState(true);
  const [allowFollow, setAllowFollow] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [readingTimeMinutes, setReadingTimeMinutes] = useState<number | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [showRevisions, setShowRevisions] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { data: post, isLoading: postLoading } = useQuery<any>({
    queryKey: ["/api/admin/cms-v2/posts", postId],
    queryFn: () => apiRequest("GET", `/api/admin/cms-v2/posts/${postId}`).then((r) => r.json()),
    enabled: !!postId,
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/cms-v2/post-categories"],
    queryFn: () => apiRequest("GET", "/api/admin/cms-v2/post-categories").then((r) => r.json()),
  });

  const { data: tags = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/cms-v2/post-tags"],
    queryFn: () => apiRequest("GET", "/api/admin/cms-v2/post-tags").then((r) => r.json()),
  });

  const { data: revisions = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/cms-v2/posts", postId, "revisions"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/cms-v2/posts/${postId}`);
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
      setAllowIndex(post.allowIndex ?? true);
      setAllowFollow(post.allowFollow ?? true);
      setFeatured(post.featured ?? false);
      setReadingTimeMinutes(post.readingTimeMinutes || null);
      setSelectedCategoryIds((post.categories || []).map((c: any) => c.id));
      setSelectedTagIds((post.tags || []).map((t: any) => t.id));
    }
  }, [post]);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/cms-v2/posts", data).then((r) => r.json()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/posts"] });
      toast({ title: "Post created" });
      navigate(`/admin/cms-v2/posts/${data.id}/edit`);
    },
    onError: (err: any) => toast({ title: "Failed to create post", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/admin/cms-v2/posts/${postId}`, data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/posts"] });
      toast({ title: "Post saved" });
      setDirty(false);
    },
    onError: (err: any) => toast({ title: "Failed to save post", description: err.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/cms-v2/posts/${postId}/publish`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/posts"] });
      toast({ title: "Post published" });
    },
    onError: () => toast({ title: "Failed to publish", variant: "destructive" }),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/cms-v2/posts/${postId}/unpublish`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/posts"] });
      toast({ title: "Post unpublished" });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (scheduledAt: string) =>
      apiRequest("POST", `/api/admin/cms-v2/posts/${postId}/schedule`, { scheduledAt }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/posts"] });
      toast({ title: "Post scheduled" });
      setShowSchedule(false);
    },
    onError: (err: any) => toast({ title: "Failed to schedule", description: err.message, variant: "destructive" }),
  });

  const createTagMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/cms-v2/post-tags", data).then((r) => r.json()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms-v2/post-tags"] });
      setSelectedTagIds((prev) => [...prev, data.id]);
      setNewTagName("");
      setDirty(true);
    },
    onError: () => toast({ title: "Failed to create tag", variant: "destructive" }),
  });

  function handleSave() {
    const data: any = {
      title,
      slug: slug || slugify(title),
      excerpt: excerpt || null,
      legacyHtml: legacyHtml || null,
      canonicalUrl: canonicalUrl || null,
      ogImageId: ogImageId || null,
      allowIndex,
      allowFollow,
      featured,
      readingTimeMinutes: readingTimeMinutes || null,
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

  const categoryOptions = useMemo(() => {
    return categories.filter((c: any) => !selectedCategoryIds.includes(c.id));
  }, [categories, selectedCategoryIds]);

  const tagOptions = useMemo(() => {
    return tags.filter((t: any) => !selectedTagIds.includes(t.id));
  }, [tags, selectedTagIds]);

  const selectedCats = useMemo(() => categories.filter((c: any) => selectedCategoryIds.includes(c.id)), [categories, selectedCategoryIds]);
  const selectedTags = useMemo(() => tags.filter((t: any) => selectedTagIds.includes(t.id)), [tags, selectedTagIds]);

  const loading = adminLoading || (!!postId && postLoading);

  if (loading) {
    return (
      <CmsV2Layout activeNav="posts" breadcrumbs={[{ label: "Posts", href: "/admin/cms-v2/posts" }, { label: isNew ? "New" : "Edit" }]}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </CmsV2Layout>
    );
  }

  if (!hasFullAccess) {
    return (
      <CmsV2Layout activeNav="posts" breadcrumbs={[{ label: "Posts" }]}>
        <div className="text-center py-20 text-muted-foreground" data-testid="text-access-denied">Access Denied</div>
      </CmsV2Layout>
    );
  }

  const status = post?.status || "draft";

  return (
    <CmsV2Layout activeNav="posts" breadcrumbs={[{ label: "Posts", href: "/admin/cms-v2/posts" }, { label: isNew ? "New Post" : post?.title || "Edit" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground gap-2"
            onClick={() => navigate("/admin/cms-v2/posts")}
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
                onClick={() => navigate(`/admin/cms-v2/posts/${postId}/builder`)}
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
                  <Label className="text-foreground/80">Content (HTML / Markdown)</Label>
                  <Textarea
                    value={legacyHtml}
                    onChange={(e) => { setLegacyHtml(e.target.value); setDirty(true); }}
                    placeholder="Write content or use the Builder for a visual editor..."
                    className="bg-muted border-border text-foreground mt-1 min-h-[200px] font-mono text-sm"
                    data-testid="input-post-content"
                  />
                  <p className="text-xs text-muted-foreground mt-1">For rich visual content, use the Puck Builder.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-foreground/80 flex items-center gap-2">
                  <SearchIcon className="w-4 h-4 text-primary" />
                  SEO & Meta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-foreground/80">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-foreground/80">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-foreground/80">Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-foreground/80">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>

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
    </CmsV2Layout>
  );
}
