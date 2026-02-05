import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Edit, Trash2, Tag, Percent, DollarSign, BarChart3, TrendingUp, TrendingDown, AlertTriangle, Power, Users, Search, ToggleLeft, ToggleRight } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlideOutPanel } from "@/components/ui/slide-out-panel";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useSavedFilters } from "@/hooks/use-saved-filters";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";
import { SavedFiltersPanel } from "@/components/admin/SavedFiltersPanel";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  maxRedemptions: number | null;
  perCustomerLimit: number | null;
  timesUsed: number;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  blockAffiliateCommission: boolean;
  blockVipDiscount: boolean;
  minMarginPercent: number;
  autoExpireEnabled: boolean;
  autoExpireThreshold: number;
  autoExpireAfterDays: number;
  autoExpiredAt: string | null;
  createdAt: string;
}

interface CouponPerformance {
  couponId: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  active: boolean;
  timesUsed: number;
  totalOrderRevenue: number;
  totalDiscountGiven: number;
  netRevenue: number;
  averageOrderValue: number;
  affiliateOverlap: number;
  affiliateCommissionBlocked: number;
  marginPercent: number;
  isUnderperforming: boolean;
  autoExpireEnabled: boolean;
  autoExpiredAt: string | null;
  createdAt: string;
}

interface CouponAnalyticsSummary {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountCost: number;
  totalNetRevenue: number;
  affiliateOverlapCount: number;
  averageMarginPercent: number;
  underperformingCount: number;
}

interface CouponFilters {
  status: string;
  search: string;
  type: string;
}

const defaultFilters: CouponFilters = {
  status: "all",
  search: "",
  type: "all",
};

export default function AdminCoupons() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("coupons");
  const [filters, setFilters] = useState<CouponFilters>(defaultFilters);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    type: "percentage",
    value: 0,
    minOrderAmount: "",
    maxDiscountAmount: "",
    maxRedemptions: "",
    perCustomerLimit: "1",
    startDate: "",
    endDate: "",
    active: true,
    blockAffiliateCommission: false,
    blockVipDiscount: false,
    minMarginPercent: 0,
    autoExpireEnabled: false,
    autoExpireThreshold: "",
    autoExpireAfterDays: "30",
  });

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/admin/coupons"],
  });

  const { data: analytics } = useQuery<CouponAnalyticsSummary>({
    queryKey: ["/api/coupons/admin/analytics"],
  });

  const { data: performance = [] } = useQuery<CouponPerformance[]>({
    queryKey: ["/api/coupons/admin/performance"],
  });

  // Saved filters
  const {
    savedFilters,
    filterName,
    setFilterName,
    saveFilter,
    deleteFilter: deleteSavedFilter,
  } = useSavedFilters<CouponFilters>("admin-coupons-filters");

  const isExpired = (coupon: Coupon) => {
    return coupon.endDate && new Date(coupon.endDate) < new Date();
  };

  // Filter coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      if (filters.status !== "all") {
        if (filters.status === "active" && !coupon.active) return false;
        if (filters.status === "inactive" && coupon.active) return false;
        if (filters.status === "expired" && !isExpired(coupon)) return false;
      }
      if (filters.type !== "all" && coupon.type !== filters.type) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (!coupon.code.toLowerCase().includes(search) && 
            !(coupon.description?.toLowerCase().includes(search))) {
          return false;
        }
      }
      return true;
    });
  }, [coupons, filters]);

  // Bulk selection
  const {
    selectedIds,
    selectedItems,
    selectedCount,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
  } = useBulkSelection(filteredCoupons);

  const hasActiveFilters = filters.status !== "all" || !!filters.search || filters.type !== "all";

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Coupon created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons/admin/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons/admin/performance"] });
      closePanel();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to create coupon", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update coupon");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Coupon updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons/admin/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons/admin/performance"] });
      closePanel();
    },
    onError: () => {
      toast({ title: "Failed to update coupon", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete coupon");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Coupon deleted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons/admin/analytics"] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (couponId: string) => {
      const res = await fetch(`/api/coupons/admin/${couponId}/disable`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to disable coupon");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Coupon disabled" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons/admin/performance"] });
    },
  });

  const enableMutation = useMutation({
    mutationFn: async (couponId: string) => {
      const res = await fetch(`/api/coupons/admin/${couponId}/enable`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to enable coupon");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Coupon enabled" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons/admin/performance"] });
    },
  });

  // Bulk enable mutation
  const bulkEnableMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/coupons/admin/${id}/enable`, {
            method: "POST",
            credentials: "include",
          })
        )
      );
      const failed = results.filter((r) => !r.ok).length;
      return { total: ids.length, failed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons/admin/performance"] });
      clearSelection();
      if (data.failed > 0) {
        toast({ title: `Enabled ${data.total - data.failed} coupons, ${data.failed} failed`, variant: "destructive" });
      } else {
        toast({ title: `Enabled ${data.total} coupons` });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to enable coupons", description: error.message, variant: "destructive" });
    },
  });

  // Bulk disable mutation
  const bulkDisableMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/coupons/admin/${id}/disable`, {
            method: "POST",
            credentials: "include",
          })
        )
      );
      const failed = results.filter((r) => !r.ok).length;
      return { total: ids.length, failed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons/admin/performance"] });
      clearSelection();
      if (data.failed > 0) {
        toast({ title: `Disabled ${data.total - data.failed} coupons, ${data.failed} failed`, variant: "destructive" });
      } else {
        toast({ title: `Disabled ${data.total} coupons` });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to disable coupons", description: error.message, variant: "destructive" });
    },
  });

  const autoExpireMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/coupons/admin/auto-expire", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to run auto-expire");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: data.expiredCount > 0 
          ? `Expired ${data.expiredCount} underperforming coupons` 
          : "No underperforming coupons found"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons/admin/performance"] });
    },
  });

  const openPanel = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        description: coupon.description || "",
        type: coupon.type,
        value: coupon.type === "fixed" ? coupon.value / 100 : coupon.value,
        minOrderAmount: coupon.minOrderAmount ? (coupon.minOrderAmount / 100).toString() : "",
        maxDiscountAmount: coupon.maxDiscountAmount ? (coupon.maxDiscountAmount / 100).toString() : "",
        maxRedemptions: coupon.maxRedemptions?.toString() || "",
        perCustomerLimit: coupon.perCustomerLimit?.toString() || "1",
        startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split("T")[0] : "",
        endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().split("T")[0] : "",
        active: coupon.active,
        blockAffiliateCommission: coupon.blockAffiliateCommission || false,
        blockVipDiscount: coupon.blockVipDiscount || false,
        minMarginPercent: coupon.minMarginPercent || 0,
        autoExpireEnabled: coupon.autoExpireEnabled || false,
        autoExpireThreshold: coupon.autoExpireThreshold ? (coupon.autoExpireThreshold / 100).toString() : "",
        autoExpireAfterDays: (coupon.autoExpireAfterDays || 30).toString(),
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: "",
        description: "",
        type: "percentage",
        value: 0,
        minOrderAmount: "",
        maxDiscountAmount: "",
        maxRedemptions: "",
        perCustomerLimit: "1",
        startDate: "",
        endDate: "",
        active: true,
        blockAffiliateCommission: false,
        blockVipDiscount: false,
        minMarginPercent: 0,
        autoExpireEnabled: false,
        autoExpireThreshold: "",
        autoExpireAfterDays: "30",
      });
    }
    setIsDirty(false);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setEditingCoupon(null);
    setIsDirty(false);
  };

  const handleSubmit = () => {
    const data = {
      code: formData.code.toUpperCase(),
      description: formData.description || null,
      type: formData.type,
      value: formData.type === "percentage" ? formData.value : Math.round(formData.value * 100),
      minOrderAmount: formData.minOrderAmount ? Math.round(parseFloat(formData.minOrderAmount) * 100) : null,
      maxDiscountAmount: formData.maxDiscountAmount ? Math.round(parseFloat(formData.maxDiscountAmount) * 100) : null,
      maxRedemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions) : null,
      perCustomerLimit: formData.perCustomerLimit ? parseInt(formData.perCustomerLimit) : null,
      startDate: formData.startDate ? new Date(formData.startDate) : null,
      endDate: formData.endDate ? new Date(formData.endDate) : null,
      active: formData.active,
      blockAffiliateCommission: formData.blockAffiliateCommission,
      blockVipDiscount: formData.blockVipDiscount,
      minMarginPercent: formData.minMarginPercent,
      autoExpireEnabled: formData.autoExpireEnabled,
      autoExpireThreshold: formData.autoExpireThreshold ? Math.round(parseFloat(formData.autoExpireThreshold) * 100) : 0,
      autoExpireAfterDays: parseInt(formData.autoExpireAfterDays) || 30,
    };

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatValue = (coupon: Coupon | CouponPerformance) => {
    if (coupon.type === "percentage") return `${coupon.value}%`;
    if (coupon.type === "fixed") return `$${(coupon.value / 100).toFixed(2)}`;
    return "Free Shipping";
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access coupons. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="coupons" role={role} />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Coupons & Discounts</h1>
            <p className="text-muted-foreground mt-1">Manage discount codes and promotions</p>
          </div>
          <div className="flex items-center gap-2">
            <SavedFiltersPanel
              savedFilters={savedFilters}
              filterName={filterName}
              setFilterName={setFilterName}
              onSave={saveFilter}
              onLoad={(filter) => setFilters(filter.filters)}
              onDelete={deleteSavedFilter}
              currentFilters={filters}
              hasActiveFilters={hasActiveFilters}
            />
            <Button onClick={() => openPanel()} className="bg-primary hover:bg-primary/90" data-testid="button-create">
              <Plus className="w-4 h-4 mr-2" /> Create Coupon
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by code or description..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-9 bg-slate-900 border-slate-700"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <div className="w-40">
                <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(v) => setFilters({ ...filters, status: v })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700" data-testid="select-filter-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
                <Select
                  value={filters.type}
                  onValueChange={(v) => setFilters({ ...filters, type: v })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700" data-testid="select-filter-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="freeShipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters(defaultFilters)}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Net Revenue</p>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(analytics.totalNetRevenue)}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Discount Cost</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(analytics.totalDiscountCost)}</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Avg Margin</p>
                    <p className="text-2xl font-bold text-cyan-400">{analytics.averageMarginPercent.toFixed(1)}%</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-cyan-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Affiliate Overlap</p>
                    <p className="text-2xl font-bold text-yellow-400">{analytics.affiliateOverlapCount}</p>
                  </div>
                  <Users className="w-8 h-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="coupons" className="data-[state=active]:bg-cyan-500">
              <Tag className="w-4 h-4 mr-2" />
              All Coupons
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-cyan-500">
              <BarChart3 className="w-4 h-4 mr-2" />
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="coupons">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
              </div>
            ) : filteredCoupons.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Tag className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">{coupons.length === 0 ? "No coupons created yet" : "No coupons match your filters"}</p>
                  {coupons.length === 0 && (
                    <Button onClick={() => openPanel()} className="bg-cyan-500 hover:bg-cyan-600">
                      Create Your First Coupon
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Select All */}
                <div className="flex items-center gap-3 px-2">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleAll}
                    data-testid="checkbox-select-all"
                  />
                  <span className="text-sm text-muted-foreground">
                    {isAllSelected ? "Deselect all" : `Select all (${filteredCoupons.length})`}
                  </span>
                </div>

                <div className="grid gap-4">
                  {filteredCoupons.map((coupon) => (
                    <Card key={coupon.id} className={`bg-slate-800 border-slate-700 ${!coupon.active || isExpired(coupon) ? "opacity-60" : ""} ${isSelected(coupon.id) ? "ring-2 ring-primary" : ""}`} data-testid={`coupon-${coupon.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={isSelected(coupon.id)}
                              onCheckedChange={() => toggleItem(coupon.id)}
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`checkbox-coupon-${coupon.id}`}
                            />
                            <div className={`p-3 rounded-lg ${coupon.type === "percentage" ? "bg-purple-500/20" : "bg-green-500/20"}`}>
                              {coupon.type === "percentage" ? (
                                <Percent className="w-6 h-6 text-purple-400" />
                              ) : (
                                <DollarSign className="w-6 h-6 text-green-400" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-white">{coupon.code}</h3>
                                <span className={`text-xs px-2 py-1 rounded ${coupon.active && !isExpired(coupon) ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                  {coupon.autoExpiredAt ? "Auto-Expired" : isExpired(coupon) ? "Expired" : coupon.active ? "Active" : "Inactive"}
                                </span>
                                {coupon.blockAffiliateCommission && (
                                  <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">No Affiliate</span>
                                )}
                              </div>
                              <p className="text-slate-400 text-sm">{coupon.description || "No description"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-cyan-400">{formatValue(coupon)}</p>
                              <p className="text-sm text-slate-400">{coupon.timesUsed} uses</p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => coupon.active ? disableMutation.mutate(coupon.id) : enableMutation.mutate(coupon.id)}
                                className={coupon.active ? "text-yellow-400 hover:text-yellow-300" : "text-green-400 hover:text-green-300"}
                                title={coupon.active ? "Disable" : "Enable"}
                                data-testid={`toggle-${coupon.id}`}
                              >
                                <Power className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openPanel(coupon)} data-testid={`edit-${coupon.id}`}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => deleteMutation.mutate(coupon.id)} data-testid={`delete-${coupon.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      {(coupon.minOrderAmount || coupon.maxRedemptions || coupon.endDate) && (
                        <div className="mt-4 pt-4 border-t border-slate-700 flex gap-4 text-sm text-slate-400">
                          {coupon.minOrderAmount && <span>Min. order: ${(coupon.minOrderAmount / 100).toFixed(2)}</span>}
                          {coupon.maxRedemptions && <span>Max uses: {coupon.maxRedemptions}</span>}
                          {coupon.endDate && <span>Expires: {new Date(coupon.endDate).toLocaleDateString()}</span>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Coupon Performance (Last 30 Days)</h2>
              <Button 
                variant="outline" 
                onClick={() => autoExpireMutation.mutate()}
                disabled={autoExpireMutation.isPending}
                className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Run Auto-Expire
              </Button>
            </div>

            {performance.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No performance data available yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-700">
                        <tr className="text-left text-slate-400 text-sm">
                          <th className="p-4">Coupon</th>
                          <th className="p-4">Revenue</th>
                          <th className="p-4">Discount Cost</th>
                          <th className="p-4">Net Revenue</th>
                          <th className="p-4">Margin</th>
                          <th className="p-4">Uses</th>
                          <th className="p-4">Affiliate Overlap</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performance.map((p) => (
                          <tr key={p.couponId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="p-4">
                              <div className="font-bold text-white">{p.code}</div>
                              <div className="text-sm text-slate-400">{formatValue(p)}</div>
                            </td>
                            <td className="p-4 text-green-400">{formatCurrency(p.totalOrderRevenue)}</td>
                            <td className="p-4 text-red-400">{formatCurrency(p.totalDiscountGiven)}</td>
                            <td className="p-4 font-bold text-cyan-400">{formatCurrency(p.netRevenue)}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-sm ${p.marginPercent >= 50 ? "bg-green-500/20 text-green-400" : p.marginPercent >= 25 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                                {p.marginPercent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-4">{p.timesUsed}</td>
                            <td className="p-4">
                              {p.affiliateOverlap > 0 && (
                                <span className="text-yellow-400">{p.affiliateOverlap} orders</span>
                              )}
                              {p.affiliateCommissionBlocked > 0 && (
                                <div className="text-xs text-slate-400">{p.affiliateCommissionBlocked} blocked</div>
                              )}
                            </td>
                            <td className="p-4">
                              {p.isUnderperforming ? (
                                <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400">Underperforming</span>
                              ) : p.active ? (
                                <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">Active</span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs bg-slate-500/20 text-slate-400">Inactive</span>
                              )}
                            </td>
                            <td className="p-4">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => p.active ? disableMutation.mutate(p.couponId) : enableMutation.mutate(p.couponId)}
                                className={p.active ? "text-yellow-400" : "text-green-400"}
                              >
                                <Power className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <SlideOutPanel
        open={isPanelOpen}
        onClose={closePanel}
        title={editingCoupon ? "Edit Coupon" : "Create Coupon"}
        isDirty={isDirty}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={closePanel}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-cyan-500 hover:bg-cyan-600"
              disabled={!formData.code || isSaving}
            >
              {isSaving ? "Saving..." : editingCoupon ? "Update Coupon" : "Create Coupon"}
            </Button>
          </div>
        }
      >
        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <Label>Coupon Code</Label>
            <Input
              value={formData.code}
              onChange={(e) => { setFormData({ ...formData, code: e.target.value.toUpperCase() }); setIsDirty(true); }}
              placeholder="SUMMER20"
              className="bg-slate-900 border-slate-700"
              data-testid="input-code"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => { setFormData({ ...formData, description: e.target.value }); setIsDirty(true); }}
              placeholder="Summer sale discount"
              className="bg-slate-900 border-slate-700"
              data-testid="input-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(v) => { setFormData({ ...formData, type: v }); setIsDirty(true); }}>
                <SelectTrigger className="bg-slate-900 border-slate-700" data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Off</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="freeShipping">Free Shipping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.type !== "freeShipping" && (
              <div className="space-y-2">
                <Label>{formData.type === "percentage" ? "Percentage" : "Amount ($)"}</Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => { setFormData({ ...formData, value: parseFloat(e.target.value) || 0 }); setIsDirty(true); }}
                  className="bg-slate-900 border-slate-700"
                  data-testid="input-value"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min. Order ($)</Label>
              <Input
                type="number"
                value={formData.minOrderAmount}
                onChange={(e) => { setFormData({ ...formData, minOrderAmount: e.target.value }); setIsDirty(true); }}
                placeholder="0.00"
                className="bg-slate-900 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Discount ($)</Label>
              <Input
                type="number"
                value={formData.maxDiscountAmount}
                onChange={(e) => { setFormData({ ...formData, maxDiscountAmount: e.target.value }); setIsDirty(true); }}
                placeholder="No limit"
                className="bg-slate-900 border-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Redemptions</Label>
              <Input
                type="number"
                value={formData.maxRedemptions}
                onChange={(e) => { setFormData({ ...formData, maxRedemptions: e.target.value }); setIsDirty(true); }}
                placeholder="Unlimited"
                className="bg-slate-900 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Per Customer Limit</Label>
              <Input
                type="number"
                value={formData.perCustomerLimit}
                onChange={(e) => { setFormData({ ...formData, perCustomerLimit: e.target.value }); setIsDirty(true); }}
                className="bg-slate-900 border-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => { setFormData({ ...formData, startDate: e.target.value }); setIsDirty(true); }}
                className="bg-slate-900 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => { setFormData({ ...formData, endDate: e.target.value }); setIsDirty(true); }}
                className="bg-slate-900 border-slate-700"
              />
            </div>
          </div>

          <div className="border-t border-slate-700 pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Stacking Rules</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Block Affiliate Commission</Label>
                  <p className="text-sm text-slate-400">No affiliate payout when this coupon is used</p>
                </div>
                <Switch
                  checked={formData.blockAffiliateCommission}
                  onCheckedChange={(v) => { setFormData({ ...formData, blockAffiliateCommission: v }); setIsDirty(true); }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Block VIP Discount</Label>
                  <p className="text-sm text-slate-400">Cannot be combined with VIP discounts</p>
                </div>
                <Switch
                  checked={formData.blockVipDiscount}
                  onCheckedChange={(v) => { setFormData({ ...formData, blockVipDiscount: v }); setIsDirty(true); }}
                />
              </div>

              <div className="space-y-2">
                <Label>Minimum Margin (%)</Label>
                <p className="text-sm text-slate-400 mb-2">Block affiliate commission if margin falls below this</p>
                <Input
                  type="number"
                  value={formData.minMarginPercent}
                  onChange={(e) => { setFormData({ ...formData, minMarginPercent: parseInt(e.target.value) || 0 }); setIsDirty(true); }}
                  placeholder="0"
                  min="0"
                  max="100"
                  className="bg-slate-900 border-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Auto-Expire Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Auto-Expire</Label>
                  <p className="text-sm text-slate-400">Automatically disable if underperforming</p>
                </div>
                <Switch
                  checked={formData.autoExpireEnabled}
                  onCheckedChange={(v) => { setFormData({ ...formData, autoExpireEnabled: v }); setIsDirty(true); }}
                />
              </div>

              {formData.autoExpireEnabled && (
                <>
                  <div className="space-y-2">
                    <Label>Min Net Revenue Threshold ($)</Label>
                    <Input
                      type="number"
                      value={formData.autoExpireThreshold}
                      onChange={(e) => { setFormData({ ...formData, autoExpireThreshold: e.target.value }); setIsDirty(true); }}
                      placeholder="0.00"
                      className="bg-slate-900 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Evaluation Period (days)</Label>
                    <Input
                      type="number"
                      value={formData.autoExpireAfterDays}
                      onChange={(e) => { setFormData({ ...formData, autoExpireAfterDays: e.target.value }); setIsDirty(true); }}
                      className="bg-slate-900 border-slate-700"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch
              checked={formData.active}
              onCheckedChange={(v) => { setFormData({ ...formData, active: v }); setIsDirty(true); }}
            />
          </div>
        </div>
      </SlideOutPanel>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedItems.length}
        onClear={clearSelection}
        actions={[
          {
            label: "Enable All",
            onClick: () => bulkEnableMutation.mutate(selectedItems.map(String)),
            icon: <Power className="w-4 h-4" />,
            variant: "default" as const,
            disabled: bulkEnableMutation.isPending || bulkDisableMutation.isPending,
          },
          {
            label: "Disable All",
            onClick: () => bulkDisableMutation.mutate(selectedItems.map(String)),
            icon: <Power className="w-4 h-4" />,
            variant: "destructive" as const,
            disabled: bulkEnableMutation.isPending || bulkDisableMutation.isPending,
          },
        ]}
      />
    </div>
  );
}
