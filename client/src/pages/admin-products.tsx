import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AmountTypeInput } from "@/components/ui/amount-type-input";
import { SlideOutPanel, PanelFooter } from "@/components/ui/slide-out-panel";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { useUpload } from "@/hooks/use-upload";
import { 
  Package, ShoppingBag, Plus, Pencil, Trash2, 
  DollarSign, Upload, X, Image as ImageIcon,
  GripVertical, Tag, Search, Globe, FileText, FolderOpen
} from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";
import { MediaPickerDialog } from "@/components/admin/MediaPickerDialog";

interface Product {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  price: number;
  primaryImage?: string;
  secondaryImages?: string[];
  images: string[];
  features: string[];
  included: string[];
  active: boolean;
  status: string;
  sku?: string;
  tags?: string[];
  salePrice?: number;
  discountType: string;
  discountValue?: number;
  saleStartAt?: string;
  saleEndAt?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  urlSlug?: string;
  canonicalUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  affiliateEnabled: boolean;
  affiliateUseGlobalSettings: boolean;
  affiliateCommissionType?: string | null;
  affiliateCommissionValue?: number | null;
  affiliateDiscountType?: string | null;
  affiliateDiscountValue?: number | null;
}

interface ProductFormData {
  name: string;
  tagline: string;
  description: string;
  price: string;
  primaryImage: string;
  secondaryImages: string[];
  features: string;
  included: string;
  active: boolean;
  status: string;
  sku: string;
  tags: string;
  discountType: string;
  discountValue: string;
  saleStartAt: string;
  saleEndAt: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  urlSlug: string;
  canonicalUrl: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  affiliateEnabled: boolean;
  affiliateUseGlobalSettings: boolean;
  affiliateCommissionType: string;
  affiliateCommissionValue: string;
  affiliateDiscountType: string;
  affiliateDiscountValue: string;
}

const defaultFormData: ProductFormData = {
  name: "",
  tagline: "",
  description: "",
  price: "",
  primaryImage: "",
  secondaryImages: [],
  features: "",
  included: "",
  active: true,
  status: "published",
  sku: "",
  tags: "",
  discountType: "NONE",
  discountValue: "",
  saleStartAt: "",
  saleEndAt: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  urlSlug: "",
  canonicalUrl: "",
  robotsIndex: true,
  robotsFollow: true,
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  affiliateEnabled: true,
  affiliateUseGlobalSettings: true,
  affiliateCommissionType: "PERCENT",
  affiliateCommissionValue: "",
  affiliateDiscountType: "PERCENT",
  affiliateDiscountValue: "",
};

export default function AdminProducts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [isDirty, setIsDirty] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      if (!formData.primaryImage) {
        setFormData(prev => ({ ...prev, primaryImage: response.objectPath }));
      } else {
        setFormData(prev => ({ 
          ...prev, 
          secondaryImages: [...prev.secondaryImages, response.objectPath] 
        }));
      }
      setIsDirty(true);
      toast({ title: "Image uploaded" });
    },
    onError: (error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    queryFn: async () => {
      const res = await fetch("/api/admin/products", { credentials: "include" });
      if (res.status === 401) {
        setLocation("/admin/login");
        return [];
      }
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      const res = await fetch("/api/admin/products", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error("Failed to create product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: "Product created" });
      closePanel();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...product }: Partial<Product> & { id: string }) => {
      const res = await fetch(`/api/admin/products/${id}`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error("Failed to update product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: "Product updated" });
      closePanel();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/products/${id}`, {
        credentials: "include", method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: "Product deleted" });
    },
  });

  const openPanel = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        tagline: product.tagline || "",
        description: product.description || "",
        price: (product.price / 100).toFixed(2),
        primaryImage: product.primaryImage || product.images?.[0] || "",
        secondaryImages: product.secondaryImages || product.images?.slice(1) || [],
        features: product.features?.join("\n") || "",
        included: product.included?.join("\n") || "",
        active: product.active,
        status: product.status || "published",
        sku: product.sku || "",
        tags: product.tags?.join(", ") || "",
        discountType: product.discountType || "NONE",
        discountValue: product.discountValue ? String(product.discountValue) : "",
        saleStartAt: product.saleStartAt ? product.saleStartAt.split("T")[0] : "",
        saleEndAt: product.saleEndAt ? product.saleEndAt.split("T")[0] : "",
        metaTitle: product.metaTitle || "",
        metaDescription: product.metaDescription || "",
        metaKeywords: product.metaKeywords || "",
        urlSlug: product.urlSlug || "",
        canonicalUrl: product.canonicalUrl || "",
        robotsIndex: product.robotsIndex ?? true,
        robotsFollow: product.robotsFollow ?? true,
        ogTitle: product.ogTitle || "",
        ogDescription: product.ogDescription || "",
        ogImage: product.ogImage || "",
        affiliateEnabled: product.affiliateEnabled ?? true,
        affiliateUseGlobalSettings: product.affiliateUseGlobalSettings ?? true,
        affiliateCommissionType: product.affiliateCommissionType || "PERCENT",
        affiliateCommissionValue: product.affiliateCommissionValue != null ? String(product.affiliateCommissionType === "FIXED" ? product.affiliateCommissionValue / 100 : product.affiliateCommissionValue) : "",
        affiliateDiscountType: product.affiliateDiscountType || "PERCENT",
        affiliateDiscountValue: product.affiliateDiscountValue != null ? String(product.affiliateDiscountType === "FIXED" ? product.affiliateDiscountValue / 100 : product.affiliateDiscountValue) : "",
      });
    } else {
      setEditingProduct(null);
      setFormData(defaultFormData);
    }
    setActiveTab("overview");
    setIsDirty(false);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setEditingProduct(null);
    setFormData(defaultFormData);
    setIsDirty(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
        return;
      }
      await uploadFile(file);
      e.target.value = "";
    }
  };

  const addImageUrl = (url: string) => {
    if (!formData.primaryImage) {
      setFormData(prev => ({ ...prev, primaryImage: url }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        secondaryImages: [...prev.secondaryImages, url] 
      }));
    }
    setIsDirty(true);
  };

  const removePrimaryImage = () => {
    if (formData.secondaryImages.length > 0) {
      setFormData(prev => ({
        ...prev,
        primaryImage: prev.secondaryImages[0],
        secondaryImages: prev.secondaryImages.slice(1),
      }));
    } else {
      setFormData(prev => ({ ...prev, primaryImage: "" }));
    }
    setIsDirty(true);
  };

  const removeSecondaryImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      secondaryImages: prev.secondaryImages.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newImages = [...formData.secondaryImages];
    const [draggedItem] = newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    
    setFormData(prev => ({ ...prev, secondaryImages: newImages }));
    setDraggedIndex(index);
    setIsDirty(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const calculateSalePrice = useCallback(() => {
    const price = Math.round(parseFloat(formData.price || "0") * 100);
    if (formData.discountType === "NONE" || !formData.discountValue) return null;
    
    const discountValue = parseInt(formData.discountValue);
    if (formData.discountType === "FIXED") {
      return Math.max(0, price - discountValue);
    } else if (formData.discountType === "PERCENT") {
      return Math.round(price * (1 - discountValue / 100));
    }
    return null;
  }, [formData.price, formData.discountType, formData.discountValue]);

  const calculatedSalePrice = calculateSalePrice();

  const handleSave = (closeAfter = false) => {
    const priceInCents = Math.round(parseFloat(formData.price) * 100);
    
    // Build the images array for backward compatibility
    const allImages = formData.primaryImage 
      ? [formData.primaryImage, ...formData.secondaryImages]
      : formData.secondaryImages;

    const product: Partial<Product> = {
      name: formData.name,
      tagline: formData.tagline || undefined,
      description: formData.description || undefined,
      price: priceInCents,
      primaryImage: formData.primaryImage || undefined,
      secondaryImages: formData.secondaryImages,
      images: allImages,
      features: formData.features.split("\n").filter(Boolean),
      included: formData.included.split("\n").filter(Boolean),
      active: formData.active,
      status: formData.status,
      sku: formData.sku || undefined,
      tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
      discountType: formData.discountType,
      discountValue: formData.discountValue ? parseInt(formData.discountValue) : undefined,
      salePrice: calculatedSalePrice ?? undefined,
      saleStartAt: formData.saleStartAt ? new Date(formData.saleStartAt).toISOString() : undefined,
      saleEndAt: formData.saleEndAt ? new Date(formData.saleEndAt).toISOString() : undefined,
      metaTitle: formData.metaTitle || undefined,
      metaDescription: formData.metaDescription || undefined,
      metaKeywords: formData.metaKeywords || undefined,
      urlSlug: formData.urlSlug || undefined,
      canonicalUrl: formData.canonicalUrl || undefined,
      robotsIndex: formData.robotsIndex,
      robotsFollow: formData.robotsFollow,
      ogTitle: formData.ogTitle || undefined,
      ogDescription: formData.ogDescription || undefined,
      ogImage: formData.ogImage || undefined,
      affiliateEnabled: formData.affiliateEnabled,
      affiliateUseGlobalSettings: formData.affiliateUseGlobalSettings,
      affiliateCommissionType: formData.affiliateUseGlobalSettings ? null : (formData.affiliateCommissionType || null),
      affiliateCommissionValue: formData.affiliateUseGlobalSettings ? null : (formData.affiliateCommissionValue ? (formData.affiliateCommissionType === "FIXED" ? Math.round(parseFloat(formData.affiliateCommissionValue) * 100) : parseInt(formData.affiliateCommissionValue)) : null),
      affiliateDiscountType: formData.affiliateUseGlobalSettings ? null : (formData.affiliateDiscountType || null),
      affiliateDiscountValue: formData.affiliateUseGlobalSettings ? null : (formData.affiliateDiscountValue ? (formData.affiliateDiscountType === "FIXED" ? Math.round(parseFloat(formData.affiliateDiscountValue) * 100) : parseInt(formData.affiliateDiscountValue)) : null),
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, ...product });
    } else {
      createMutation.mutate(product);
    }
    
    if (!closeAfter) {
      setIsDirty(false);
    }
  };

  const getImageSrc = (img: string) => {
    if (img.startsWith("/objects/")) return img;
    return img;
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
              <p className="text-muted-foreground">You don't have permission to access products. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="products" role={role} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-3xl font-bold">Products</h2>
          <Button className="gap-2" onClick={() => openPanel()} data-testid="button-add-product">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading products...</div>
        ) : !products?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No products yet. Add your first product to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const displayImage = product.primaryImage || product.images?.[0];
              const isOnSale = product.discountType !== "NONE" && product.salePrice;
              
              return (
                <Card key={product.id} className={!product.active ? "opacity-60" : ""} data-testid={`product-card-${product.id}`}>
                  <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted relative">
                    {displayImage ? (
                      <>
                        <img
                          src={getImageSrc(displayImage)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            const fallback = (e.target as HTMLImageElement).nextElementSibling;
                            if (fallback) (fallback as HTMLElement).style.display = "flex";
                          }}
                        />
                        <div className="w-full h-full items-center justify-center text-muted-foreground" style={{ display: "none" }}>
                          <ImageIcon className="w-12 h-12" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-12 h-12" />
                      </div>
                    )}
                    {isOnSale && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                        SALE
                      </span>
                    )}
                    {product.status === "draft" && (
                      <span className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                        DRAFT
                      </span>
                    )}
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        {product.tagline && (
                          <p className="text-sm text-muted-foreground mt-1">{product.tagline}</p>
                        )}
                      </div>
                      {!product.active && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">Inactive</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      {isOnSale ? (
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-2xl font-bold text-red-500">
                            ${((product.salePrice || 0) / 100).toLocaleString()}
                          </span>
                          <span className="text-muted-foreground line-through">
                            ${(product.price / 100).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <p className="font-display text-2xl font-bold text-primary">
                          ${(product.price / 100).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => openPanel(product)}
                        data-testid={`button-edit-${product.id}`}
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this product?")) {
                            deleteMutation.mutate(product.id);
                          }
                        }}
                        data-testid={`button-delete-${product.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <SlideOutPanel
        open={isPanelOpen}
        onClose={closePanel}
        title={editingProduct ? "Edit Product" : "Add Product"}
        isDirty={isDirty}
        width="xl"
        footer={
          <PanelFooter
            onCancel={closePanel}
            onSave={() => handleSave(false)}
            onSaveAndClose={() => handleSave(true)}
            isSaving={isSaving}
          />
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
              <FileText className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-2" data-testid="tab-photos">
              <ImageIcon className="w-4 h-4" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="gap-2" data-testid="tab-affiliate">
              <Tag className="w-4 h-4" />
              Affiliate
            </TabsTrigger>
            <TabsTrigger value="seo" className="gap-2" data-testid="tab-seo">
              <Search className="w-4 h-4" />
              SEO
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-0">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">Product Title *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    setIsDirty(true);
                  }}
                  required
                  data-testid="input-product-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Short Description</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, tagline: e.target.value }));
                    setIsDirty(true);
                  }}
                  data-testid="input-product-tagline"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Full Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                    setIsDirty(true);
                  }}
                  rows={4}
                  data-testid="input-product-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="features">Features (one per line)</Label>
                <Textarea
                  id="features"
                  value={formData.features}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, features: e.target.value }));
                    setIsDirty(true);
                  }}
                  rows={4}
                  placeholder="Reaches temperatures as low as 30°F&#10;Built-in filtration system&#10;Digital temperature controls"
                  data-testid="input-product-features"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="included">What's Included (one per line)</Label>
                <Textarea
                  id="included"
                  value={formData.included}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, included: e.target.value }));
                    setIsDirty(true);
                  }}
                  rows={4}
                  placeholder="Insulated portable tub&#10;1HP chiller unit&#10;Thermal locking lid"
                  data-testid="input-product-included"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Pricing</h3>
              
              <div className="space-y-2">
                <Label htmlFor="price">Regular Price ($) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, price: e.target.value }));
                      setIsDirty(true);
                    }}
                    required
                    className="pl-10"
                    data-testid="input-product-price"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sale Configuration</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, discountType: value, discountValue: "" }));
                    setIsDirty(true);
                  }}
                >
                  <SelectTrigger data-testid="select-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Not on Sale</SelectItem>
                    <SelectItem value="FIXED">Fixed Sale Price</SelectItem>
                    <SelectItem value="PERCENT">Percentage Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.discountType !== "NONE" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="discountValue">
                      {formData.discountType === "FIXED" ? "Discount Amount (cents)" : "Discount Percentage"}
                    </Label>
                    <div className="relative">
                      {formData.discountType === "FIXED" ? (
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      ) : (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      )}
                      <Input
                        id="discountValue"
                        type="number"
                        min="0"
                        max={formData.discountType === "PERCENT" ? "100" : undefined}
                        value={formData.discountValue}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, discountValue: e.target.value }));
                          setIsDirty(true);
                        }}
                        className={formData.discountType === "FIXED" ? "pl-10" : "pr-10"}
                        data-testid="input-discount-value"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="saleStartAt">Sale Start Date</Label>
                      <Input
                        id="saleStartAt"
                        type="date"
                        value={formData.saleStartAt}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, saleStartAt: e.target.value }));
                          setIsDirty(true);
                        }}
                        data-testid="input-sale-start"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="saleEndAt">Sale End Date</Label>
                      <Input
                        id="saleEndAt"
                        type="date"
                        value={formData.saleEndAt}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, saleEndAt: e.target.value }));
                          setIsDirty(true);
                        }}
                        data-testid="input-sale-end"
                      />
                    </div>
                  </div>

                  {calculatedSalePrice !== null && formData.price && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Price Preview</p>
                      <div className="flex items-baseline gap-3">
                        <span className="text-muted-foreground line-through">
                          ${parseFloat(formData.price).toLocaleString()}
                        </span>
                        <span className="font-display text-2xl font-bold text-red-500">
                          ${(calculatedSalePrice / 100).toLocaleString()}
                        </span>
                        <span className="text-sm text-green-500">
                          Save ${((parseFloat(formData.price) * 100 - calculatedSalePrice) / 100).toLocaleString()}
                          {formData.discountType === "PERCENT" && ` (${formData.discountValue}%)`}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Status & Organization</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, status: value }));
                      setIsDirty(true);
                    }}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, sku: e.target.value }));
                      setIsDirty(true);
                    }}
                    placeholder="PP-COLD-001"
                    data-testid="input-sku"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, tags: e.target.value }));
                      setIsDirty(true);
                    }}
                    placeholder="cold plunge, recovery, wellness"
                    className="pl-10"
                    data-testid="input-tags"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({ ...prev, active: checked }));
                    setIsDirty(true);
                  }}
                  data-testid="switch-product-active"
                />
                <Label htmlFor="active">Visible on store</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="photos" className="space-y-6 mt-0">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Primary Image</h3>
              <p className="text-sm text-muted-foreground">
                This is the main image shown on the storefront and in product listings.
              </p>
              
              {formData.primaryImage ? (
                <div className="relative aspect-video max-w-md rounded-lg overflow-hidden border border-border bg-muted group">
                  <img
                    src={getImageSrc(formData.primaryImage)}
                    alt="Primary product"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23334155' width='100' height='100'/%3E%3Ctext fill='%2394a3b8' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='12'%3EImage Error%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  <button
                    type="button"
                    onClick={removePrimaryImage}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid="button-remove-primary-image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Primary
                  </span>
                </div>
              ) : (
                <div className="aspect-video max-w-md rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                    <p>No primary image selected</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Secondary Images</h3>
              <p className="text-sm text-muted-foreground">
                Additional images for the product gallery. Drag to reorder.
              </p>
              
              {formData.secondaryImages.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {formData.secondaryImages.map((img, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group cursor-move ${
                        draggedIndex === index ? "opacity-50" : ""
                      }`}
                    >
                      <div className="absolute top-2 left-2 z-10 bg-black/50 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-4 h-4 text-white" />
                      </div>
                      <img
                        src={getImageSrc(img)}
                        alt={`Secondary ${index + 1}`}
                        className="w-full h-full object-cover pointer-events-none"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23334155' width='100' height='100'/%3E%3Ctext fill='%2394a3b8' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='12'%3EError%3C/text%3E%3C/svg%3E";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeSecondaryImage(index)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-remove-secondary-${index}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Add Images</h3>
              
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                  data-testid="input-upload-image"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setMediaPickerOpen(true)}
                  data-testid="button-media-library"
                >
                  <FolderOpen className="w-4 h-4" />
                  Media Library
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-image"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? "Uploading..." : "Upload New"}
                </Button>
              </div>
              <MediaPickerDialog
                open={mediaPickerOpen}
                onOpenChange={setMediaPickerOpen}
                onSelect={(url) => {
                  if (!formData.primaryImage) {
                    setFormData((prev) => ({ ...prev, primaryImage: url }));
                  } else {
                    setFormData((prev) => ({ ...prev, secondaryImages: [...prev.secondaryImages, url] }));
                  }
                  setIsDirty(true);
                }}
              />

              <div className="relative">
                <Input
                  placeholder="Or paste image URL and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const url = input.value.trim();
                      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
                        addImageUrl(url);
                        input.value = "";
                      }
                    }
                  }}
                  data-testid="input-image-url"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="affiliate" className="space-y-6 mt-0">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Affiliate Settings</h3>
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Affiliate Eligible</Label>
                  <p className="text-xs text-muted-foreground">Allow affiliate commissions and discounts for this product</p>
                </div>
                <Switch
                  checked={formData.affiliateEnabled}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({ ...prev, affiliateEnabled: checked }));
                    setIsDirty(true);
                  }}
                  data-testid="switch-affiliate-enabled"
                />
              </div>

              {formData.affiliateEnabled && (
                <>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label>Use Global Defaults</Label>
                      <p className="text-xs text-muted-foreground">Use the global affiliate commission and discount settings</p>
                    </div>
                    <Switch
                      checked={formData.affiliateUseGlobalSettings}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({ ...prev, affiliateUseGlobalSettings: checked }));
                        setIsDirty(true);
                      }}
                      data-testid="switch-affiliate-use-global"
                    />
                  </div>

                  {!formData.affiliateUseGlobalSettings && (
                    <div className="space-y-6 border border-border rounded-lg p-4">
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">Commission Override</h4>
                        <AmountTypeInput
                          value={formData.affiliateCommissionValue ? parseFloat(formData.affiliateCommissionValue) : 0}
                          onChange={(v) => {
                            setFormData(prev => ({ ...prev, affiliateCommissionValue: v === 0 ? "" : String(v) }));
                            setIsDirty(true);
                          }}
                          type={formData.affiliateCommissionType === "FIXED" ? "fixed" : "percent"}
                          onTypeChange={(t) => {
                            setFormData(prev => ({ ...prev, affiliateCommissionType: t === "fixed" ? "FIXED" : "PERCENT", affiliateCommissionValue: "" }));
                            setIsDirty(true);
                          }}
                          data-testid="input-product-commission-value"
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.affiliateCommissionType === "FIXED" ? "Flat commission in dollars" : "Percentage of the net sale amount"}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">Customer Discount Override</h4>
                        <AmountTypeInput
                          value={formData.affiliateDiscountValue ? parseFloat(formData.affiliateDiscountValue) : 0}
                          onChange={(v) => {
                            setFormData(prev => ({ ...prev, affiliateDiscountValue: v === 0 ? "" : String(v) }));
                            setIsDirty(true);
                          }}
                          type={formData.affiliateDiscountType === "FIXED" ? "fixed" : "percent"}
                          onTypeChange={(t) => {
                            setFormData(prev => ({ ...prev, affiliateDiscountType: t === "fixed" ? "FIXED" : "PERCENT", affiliateDiscountValue: "" }));
                            setIsDirty(true);
                          }}
                          data-testid="input-product-discount-value"
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.affiliateDiscountType === "FIXED" ? "Flat discount in dollars" : "Percentage off for referred customers"}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="seo" className="space-y-6 mt-0">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Search Engine Optimization</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <span className={`text-xs ${formData.metaTitle.length > 60 ? "text-yellow-500" : "text-muted-foreground"}`}>
                    {formData.metaTitle.length}/60
                  </span>
                </div>
                <Input
                  id="metaTitle"
                  value={formData.metaTitle}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, metaTitle: e.target.value }));
                    setIsDirty(true);
                  }}
                  placeholder={formData.name || "Product title"}
                  data-testid="input-meta-title"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <span className={`text-xs ${formData.metaDescription.length > 160 ? "text-yellow-500" : "text-muted-foreground"}`}>
                    {formData.metaDescription.length}/160
                  </span>
                </div>
                <Textarea
                  id="metaDescription"
                  value={formData.metaDescription}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, metaDescription: e.target.value }));
                    setIsDirty(true);
                  }}
                  rows={3}
                  placeholder="Brief description for search results..."
                  data-testid="input-meta-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaKeywords">Meta Keywords</Label>
                <Input
                  id="metaKeywords"
                  value={formData.metaKeywords}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, metaKeywords: e.target.value }));
                    setIsDirty(true);
                  }}
                  placeholder="cold plunge, ice bath, recovery"
                  data-testid="input-meta-keywords"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="urlSlug">URL Slug</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="urlSlug"
                    value={formData.urlSlug}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, urlSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }));
                      setIsDirty(true);
                    }}
                    placeholder="power-plunge-portable-cold-tub"
                    className="pl-10"
                    data-testid="input-url-slug"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="canonicalUrl">Canonical URL (optional)</Label>
                <Input
                  id="canonicalUrl"
                  value={formData.canonicalUrl}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, canonicalUrl: e.target.value }));
                    setIsDirty(true);
                  }}
                  placeholder="https://..."
                  data-testid="input-canonical-url"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Robots Meta</h3>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id="robotsIndex"
                    checked={formData.robotsIndex}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({ ...prev, robotsIndex: checked }));
                      setIsDirty(true);
                    }}
                    data-testid="switch-robots-index"
                  />
                  <Label htmlFor="robotsIndex">Allow search engines to index this page</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="robotsFollow"
                    checked={formData.robotsFollow}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({ ...prev, robotsFollow: checked }));
                      setIsDirty(true);
                    }}
                    data-testid="switch-robots-follow"
                  />
                  <Label htmlFor="robotsFollow">Allow search engines to follow links</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Open Graph (Social Sharing)</h3>
              
              <div className="space-y-2">
                <Label htmlFor="ogTitle">OG Title</Label>
                <Input
                  id="ogTitle"
                  value={formData.ogTitle}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, ogTitle: e.target.value }));
                    setIsDirty(true);
                  }}
                  placeholder={formData.metaTitle || formData.name || "Falls back to Meta Title"}
                  data-testid="input-og-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ogDescription">OG Description</Label>
                <Textarea
                  id="ogDescription"
                  value={formData.ogDescription}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, ogDescription: e.target.value }));
                    setIsDirty(true);
                  }}
                  rows={2}
                  placeholder={formData.metaDescription || "Falls back to Meta Description"}
                  data-testid="input-og-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ogImage">OG Image URL</Label>
                <Input
                  id="ogImage"
                  value={formData.ogImage}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, ogImage: e.target.value }));
                    setIsDirty(true);
                  }}
                  placeholder={formData.primaryImage || "Falls back to Primary Image"}
                  data-testid="input-og-image"
                />
                {(formData.ogImage || formData.primaryImage) && (
                  <div className="mt-2 aspect-video max-w-xs rounded border border-border overflow-hidden">
                    <img
                      src={getImageSrc(formData.ogImage || formData.primaryImage)}
                      alt="OG Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SlideOutPanel>
    </div>
  );
}
