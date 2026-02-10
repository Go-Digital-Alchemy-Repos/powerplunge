import { useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import CmsLayout from "@/components/admin/CmsLayout";
import {
  PenLine, Plus, Globe, GlobeLock, MoreHorizontal, Pencil, Trash2, Eye,
  Search, Calendar, Archive, Clock, ChevronLeft, ChevronRight, Blocks, Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground border-border", icon: GlobeLock },
  published: { label: "Published", color: "bg-green-900/40 text-green-400 border-green-800", icon: Globe },
  scheduled: { label: "Scheduled", color: "bg-blue-900/40 text-blue-400 border-blue-800", icon: Clock },
  archived: { label: "Archived", color: "bg-orange-900/40 text-orange-400 border-orange-800", icon: Archive },
};

export default function AdminCmsPosts() {
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("pageSize", String(pageSize));
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (categoryFilter !== "all") queryParams.set("category", categoryFilter);
  if (tagFilter !== "all") queryParams.set("tag", tagFilter);
  if (searchTerm) queryParams.set("q", searchTerm);

  const { data: postsData, isLoading } = useQuery<{ data: any[]; total: number; page: number; pageSize: number }>({
    queryKey: ["/api/admin/cms/posts", page, pageSize, statusFilter, categoryFilter, tagFilter, searchTerm],
    queryFn: () => apiRequest("GET", `/api/admin/cms/posts?${queryParams.toString()}`).then((r) => r.json()),
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/cms/post-categories"],
    queryFn: () => apiRequest("GET", "/api/admin/cms/post-categories").then((r) => r.json()),
  });

  const { data: tags = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/cms/post-tags"],
    queryFn: () => apiRequest("GET", "/api/admin/cms/post-tags").then((r) => r.json()),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/cms/posts/${id}/publish`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/posts"] });
      toast({ title: "Post published" });
    },
    onError: () => toast({ title: "Failed to publish", variant: "destructive" }),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/cms/posts/${id}/unpublish`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/posts"] });
      toast({ title: "Post unpublished" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/cms/posts/${id}/archive`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/posts"] });
      toast({ title: "Post archived" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/cms/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/posts"] });
      toast({ title: "Post deleted" });
    },
  });

  const posts = postsData?.data ?? [];
  const total = postsData?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  if (adminLoading || isLoading) {
    return (
      <CmsLayout activeNav="posts" breadcrumbs={[{ label: "Posts" }]}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </CmsLayout>
    );
  }

  if (!hasFullAccess) {
    return (
      <CmsLayout activeNav="posts" breadcrumbs={[{ label: "Posts" }]}>
        <div className="text-center py-20 text-muted-foreground" data-testid="text-access-denied">Access Denied</div>
      </CmsLayout>
    );
  }

  return (
    <CmsLayout activeNav="posts" breadcrumbs={[{ label: "Posts" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-posts-title">Posts</h1>
            <p className="text-sm text-muted-foreground mt-1">{total} post{total !== 1 ? "s" : ""} total</p>
          </div>
          <Button
            onClick={() => navigate("/admin/cms/posts/new")}
            className="bg-primary gap-2"
            data-testid="button-create-post"
          >
            <Plus className="w-4 h-4" />
            New Post
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder="Search posts..."
              className="pl-10 bg-card border-border text-foreground"
              data-testid="input-search-posts"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-card border-border text-foreground" data-testid="select-status-filter">
              <Filter className="w-3 h-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] bg-card border-border text-foreground" data-testid="select-category-filter">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-card border-border text-foreground" data-testid="select-tag-filter">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="all">All Tags</SelectItem>
              {tags.map((tag: any) => (
                <SelectItem key={tag.id} value={tag.slug}>{tag.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground" data-testid="text-no-posts">
            <PenLine className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No posts found. Create your first blog post.</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm" data-testid="table-posts">
                <thead>
                  <tr className="bg-card border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Title</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium w-[100px]">Status</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium hidden lg:table-cell">Categories</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium hidden lg:table-cell">Tags</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium hidden md:table-cell w-[100px]">Updated</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium hidden md:table-cell w-[110px]">Published</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium w-[50px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post: any) => {
                    const status = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
                    const StatusIcon = status.icon;
                    return (
                      <tr
                        key={post.id}
                        className="border-b border-border hover:bg-card/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/cms/posts/${post.id}/edit`)}
                        data-testid={`row-post-${post.id}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {post.coverImageUrl && (
                              <div className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                                <img src={post.coverImageUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate" data-testid={`text-post-title-${post.id}`}>{post.title}</p>
                              <p className="text-xs text-muted-foreground truncate">/{post.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className={`text-xs ${status.color}`} data-testid={`badge-post-status-${post.id}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {(post.categories || []).slice(0, 2).map((cat: any) => (
                              <Badge key={cat.id} variant="outline" className="text-xs border-border text-muted-foreground">
                                {cat.name}
                              </Badge>
                            ))}
                            {(post.categories || []).length > 2 && (
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">+{post.categories.length - 2}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {(post.tags || []).slice(0, 2).map((tag: any) => (
                              <Badge key={tag.id} variant="outline" className="text-xs border-primary/30 text-primary">
                                {tag.name}
                              </Badge>
                            ))}
                            {(post.tags || []).length > 2 && (
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">+{post.tags.length - 2}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <span className="text-xs text-muted-foreground">{formatDate(post.updatedAt)}</span>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <span className="text-xs text-muted-foreground">{formatDate(post.publishedAt)}</span>
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" data-testid={`button-post-menu-${post.id}`}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 text-foreground">
                              <DropdownMenuItem
                                className="cursor-pointer hover:!bg-gray-700/70 focus:!bg-gray-700/70 hover:!text-foreground focus:!text-foreground gap-2"
                                onClick={() => navigate(`/admin/cms/posts/${post.id}/edit`)}
                                data-testid={`button-edit-post-${post.id}`}
                              >
                                <Pencil className="w-4 h-4" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer hover:!bg-gray-700/70 focus:!bg-gray-700/70 hover:!text-foreground focus:!text-foreground gap-2"
                                onClick={() => navigate(`/admin/cms/posts/${post.id}/builder`)}
                                data-testid={`button-builder-post-${post.id}`}
                              >
                                <Blocks className="w-4 h-4" />Open Builder
                              </DropdownMenuItem>
                              {post.status === "published" && (
                                <DropdownMenuItem
                                  className="cursor-pointer hover:!bg-gray-700/70 focus:!bg-gray-700/70 hover:!text-foreground focus:!text-foreground gap-2"
                                  onClick={() => window.open(`/blog/${post.slug}`, "_blank")}
                                  data-testid={`button-preview-post-${post.id}`}
                                >
                                  <Eye className="w-4 h-4" />Preview
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="bg-gray-700" />
                              {post.status !== "published" && (
                                <DropdownMenuItem
                                  className="cursor-pointer hover:!bg-gray-700/70 focus:!bg-gray-700/70 hover:!text-foreground focus:!text-foreground gap-2"
                                  onClick={() => publishMutation.mutate(post.id)}
                                  data-testid={`button-publish-post-${post.id}`}
                                >
                                  <Globe className="w-4 h-4" />Publish
                                </DropdownMenuItem>
                              )}
                              {post.status === "published" && (
                                <DropdownMenuItem
                                  className="cursor-pointer hover:!bg-gray-700/70 focus:!bg-gray-700/70 hover:!text-foreground focus:!text-foreground gap-2"
                                  onClick={() => unpublishMutation.mutate(post.id)}
                                  data-testid={`button-unpublish-post-${post.id}`}
                                >
                                  <GlobeLock className="w-4 h-4" />Unpublish
                                </DropdownMenuItem>
                              )}
                              {post.status !== "archived" && (
                                <DropdownMenuItem
                                  className="cursor-pointer hover:!bg-gray-700/70 focus:!bg-gray-700/70 hover:!text-foreground focus:!text-foreground gap-2"
                                  onClick={() => archiveMutation.mutate(post.id)}
                                  data-testid={`button-archive-post-${post.id}`}
                                >
                                  <Archive className="w-4 h-4" />Archive
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem
                                className="cursor-pointer hover:!bg-red-900/40 focus:!bg-red-900/40 gap-2 text-red-400 hover:!text-red-300 focus:!text-red-300"
                                onClick={() => {
                                  if (window.confirm("Delete this post?")) {
                                    deleteMutation.mutate(post.id);
                                  }
                                }}
                                data-testid={`button-delete-post-${post.id}`}
                              >
                                <Trash2 className="w-4 h-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border text-muted-foreground hover:text-foreground"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border text-muted-foreground hover:text-foreground"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </CmsLayout>
  );
}
