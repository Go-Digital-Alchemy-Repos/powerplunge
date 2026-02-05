import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Plus, Trash2, Link2, TrendingUp, Eye, MousePointer, ShoppingCart, Loader2, Target, Package } from "lucide-react";
import { SlideOutPanel, PanelFooter } from "@/components/ui/slide-out-panel";
import AdminNav from "@/components/admin/AdminNav";

interface Product {
  id: string;
  name: string;
  price: number;
  primaryImage?: string;
}

interface ProductRelationship {
  id: string;
  productId: string;
  relatedProductId: string;
  relationshipType: string;
  sortOrder: number;
  isActive: boolean;
  relatedProduct?: Product;
}

interface UpsellAnalytics {
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  clickThroughRate: number;
  conversionRate: number;
  byProduct: Array<{
    productId: string;
    productName: string;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
  }>;
}

export default function AdminUpsells() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [newRelation, setNewRelation] = useState({
    productId: "",
    relatedProductId: "",
    relationshipType: "cross_sell",
    sortOrder: 0,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: relationships = [], isLoading: loadingRelationships } = useQuery<ProductRelationship[]>({
    queryKey: ["/api/upsells/admin/relationships", selectedProduct],
    queryFn: async () => {
      if (!selectedProduct) return [];
      const res = await fetch(`/api/upsells/admin/relationships/${selectedProduct}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch relationships");
      return res.json();
    },
    enabled: !!selectedProduct,
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery<UpsellAnalytics>({
    queryKey: ["/api/upsells/admin/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/upsells/admin/analytics", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  const createRelationship = useMutation({
    mutationFn: async (data: typeof newRelation) => {
      const res = await fetch("/api/upsells/admin/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create relationship");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Product relationship created" });
      queryClient.invalidateQueries({ queryKey: ["/api/upsells/admin/relationships"] });
      setIsPanelOpen(false);
      setNewRelation({ productId: "", relatedProductId: "", relationshipType: "cross_sell", sortOrder: 0 });
    },
    onError: () => {
      toast({ title: "Failed to create relationship", variant: "destructive" });
    },
  });

  const deleteRelationship = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/upsells/admin/relationships/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete relationship");
    },
    onSuccess: () => {
      toast({ title: "Relationship removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/upsells/admin/relationships"] });
    },
  });

  const relationshipTypes = [
    { value: "upsell", label: "Upsell", description: "Higher-value alternative" },
    { value: "cross_sell", label: "Cross-Sell", description: "Complementary product" },
    { value: "frequently_bought_together", label: "Frequently Bought Together", description: "Commonly purchased with" },
    { value: "accessory", label: "Accessory", description: "Add-on item" },
  ];

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access upsells. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="upsells" role={role} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">Upsell Management</h1>
            <p className="text-muted-foreground">Configure product relationships and track upsell performance</p>
          </div>
          <Button onClick={() => setIsPanelOpen(true)} data-testid="button-add-relationship">
            <Plus className="w-4 h-4 mr-2" /> Add Relationship
          </Button>
        </div>

        <Tabs defaultValue="analytics">
              <TabsList className="mb-6">
                <TabsTrigger value="analytics" className="gap-2">
                  <TrendingUp className="w-4 h-4" /> Analytics
                </TabsTrigger>
                <TabsTrigger value="relationships" className="gap-2">
                  <Link2 className="w-4 h-4" /> Relationships
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics">
                {loadingAnalytics ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : analytics ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Impressions</CardDescription>
                          <CardTitle className="text-2xl flex items-center gap-2">
                            <Eye className="w-5 h-5 text-muted-foreground" />
                            {analytics.totalImpressions.toLocaleString()}
                          </CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Clicks</CardDescription>
                          <CardTitle className="text-2xl flex items-center gap-2">
                            <MousePointer className="w-5 h-5 text-muted-foreground" />
                            {analytics.totalClicks.toLocaleString()}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            {(analytics.clickThroughRate * 100).toFixed(1)}% CTR
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Conversions</CardDescription>
                          <CardTitle className="text-2xl flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                            {analytics.totalConversions.toLocaleString()}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            {(analytics.conversionRate * 100).toFixed(1)}% rate
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardDescription>Revenue Generated</CardDescription>
                          <CardTitle className="text-2xl text-green-500">
                            ${(analytics.totalRevenue / 100).toLocaleString()}
                          </CardTitle>
                        </CardHeader>
                      </Card>
                    </div>

                    {analytics.byProduct?.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Performance by Product</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="text-left text-sm text-muted-foreground border-b">
                                  <th className="pb-3">Product</th>
                                  <th className="pb-3 text-right">Impressions</th>
                                  <th className="pb-3 text-right">Clicks</th>
                                  <th className="pb-3 text-right">Conversions</th>
                                  <th className="pb-3 text-right">Revenue</th>
                                  <th className="pb-3 text-right">Conv. Rate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analytics.byProduct.map((p) => (
                                  <tr key={p.productId} className="border-b last:border-0">
                                    <td className="py-3 font-medium">{p.productName}</td>
                                    <td className="py-3 text-right">{p.impressions}</td>
                                    <td className="py-3 text-right">{p.clicks}</td>
                                    <td className="py-3 text-right">{p.conversions}</td>
                                    <td className="py-3 text-right text-green-500">
                                      ${(p.revenue / 100).toLocaleString()}
                                    </td>
                                    <td className="py-3 text-right">
                                      {(p.conversionRate * 100).toFixed(1)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Analytics Yet</h3>
                      <p className="text-muted-foreground">Start by adding product relationships to enable upsells</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="relationships">
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <Label>Select Product</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger className="max-w-md mt-2">
                        <SelectValue placeholder="Choose a product to view its relationships" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {selectedProduct ? (
                  loadingRelationships ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : relationships.length > 0 ? (
                    <div className="space-y-3">
                      {relationships.map((rel) => (
                        <Card key={rel.id}>
                          <CardContent className="py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {rel.relatedProduct?.primaryImage && (
                                <img
                                  src={rel.relatedProduct.primaryImage}
                                  alt=""
                                  className="w-12 h-12 object-contain bg-muted rounded"
                                />
                              )}
                              <div>
                                <p className="font-medium">{rel.relatedProduct?.name || rel.relatedProductId}</p>
                                <Badge variant="outline" className="mt-1">
                                  {relationshipTypes.find(t => t.value === rel.relationshipType)?.label || rel.relationshipType}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRelationship.mutate(rel.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Relationships</h3>
                        <p className="text-muted-foreground mb-4">This product has no upsell or cross-sell relationships yet</p>
                        <Button onClick={() => { setNewRelation({ ...newRelation, productId: selectedProduct }); setIsPanelOpen(true); }}>
                          <Plus className="w-4 h-4 mr-2" /> Add Relationship
                        </Button>
                      </CardContent>
                    </Card>
                  )
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Select a Product</h3>
                      <p className="text-muted-foreground">Choose a product above to view and manage its relationships</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
        </Tabs>
      </div>

      <SlideOutPanel open={isPanelOpen} onClose={() => setIsPanelOpen(false)} title="Add Product Relationship">
        <div className="space-y-6 p-6">
          <div>
            <Label>Source Product</Label>
            <Select
              value={newRelation.productId}
              onValueChange={(v) => setNewRelation({ ...newRelation, productId: v })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select source product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Related Product</Label>
            <Select
              value={newRelation.relatedProductId}
              onValueChange={(v) => setNewRelation({ ...newRelation, relatedProductId: v })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select related product" />
              </SelectTrigger>
              <SelectContent>
                {products.filter(p => p.id !== newRelation.productId).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Relationship Type</Label>
            <Select
              value={newRelation.relationshipType}
              onValueChange={(v) => setNewRelation({ ...newRelation, relationshipType: v })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {relationshipTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div>
                      <span className="font-medium">{t.label}</span>
                      <span className="text-muted-foreground text-xs ml-2">- {t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={newRelation.sortOrder}
              onChange={(e) => setNewRelation({ ...newRelation, sortOrder: parseInt(e.target.value) || 0 })}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first</p>
          </div>
        </div>
        <PanelFooter
          onCancel={() => setIsPanelOpen(false)}
          onSave={() => createRelationship.mutate(newRelation)}
          isSaving={createRelationship.isPending}
          saveLabel="Create Relationship"
        />
      </SlideOutPanel>
    </div>
  );
}
