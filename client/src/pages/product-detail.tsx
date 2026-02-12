import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, Check, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteLayout from "@/components/SiteLayout";
import { trackViewItem, trackAddToCart } from "@/lib/analytics";

interface Product {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  price: number;
  salePrice?: number;
  discountType?: string;
  discountValue?: number;
  primaryImage?: string;
  secondaryImages?: string[];
  features: string[];
  included: string[];
  metaTitle?: string;
  metaDescription?: string;
  urlSlug?: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function ProductDetail() {
  const [matchSlug, paramsSlug] = useRoute("/products/:slug");
  const [, navigate] = useLocation();
  const slug = paramsSlug?.slug || "";

  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("cart");
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ["/api/products/slug", slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/slug/${slug}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Product not found");
        throw new Error("Failed to fetch product");
      }
      return res.json();
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (product) {
      trackViewItem({
        id: product.id,
        name: product.name,
        price: (product.salePrice || product.price) / 100,
      });
    }
  }, [product]);

  const allImages = product
    ? [product.primaryImage, ...(product.secondaryImages || [])].filter(Boolean) as string[]
    : [];

  const handleAddToCart = () => {
    if (!product) return;

    trackAddToCart({
      id: product.id,
      name: product.name,
      price: (product.salePrice || product.price) / 100,
      quantity,
    });

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, {
        id: product.id,
        name: product.name,
        price: product.salePrice || product.price,
        quantity,
        image: product.primaryImage || "",
      }];
    });
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const discountPercentage = product?.salePrice && product.price > 0
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
        </div>
      </SiteLayout>
    );
  }

  if (error || !product) {
    return (
      <SiteLayout>
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4" data-testid="text-product-not-found">Product Not Found</h1>
          <p className="text-muted-foreground mb-8">The product you're looking for doesn't exist or has been removed.</p>
          <Button
            onClick={() => navigate("/shop")}
            className="bg-cyan-500 hover:bg-cyan-600 text-black"
            data-testid="button-back-to-shop"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shop
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/shop")}
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 -ml-2"
            data-testid="button-back-to-shop"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shop
          </Button>
          <Button
            onClick={() => navigate("/checkout")}
            variant="outline"
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            disabled={cart.length === 0}
            data-testid="button-cart"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {cartCount > 0 && <span className="mr-2">{cartCount}</span>}
            ${(cartTotal / 100).toFixed(2)}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {allImages.length > 0 ? (
              <div>
                <div className="relative rounded-xl overflow-hidden bg-slate-800/50 border border-slate-700 mb-4">
                  <img
                    src={allImages[selectedImageIndex]}
                    alt={product.name}
                    className="w-full h-[400px] sm:h-[500px] object-cover"
                    data-testid="img-product-main"
                  />
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setSelectedImageIndex(i => i === 0 ? allImages.length - 1 : i - 1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                        data-testid="button-prev-image"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setSelectedImageIndex(i => i === allImages.length - 1 ? 0 : i + 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                        data-testid="button-next-image"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  {discountPercentage > 0 && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                      {discountPercentage}% OFF
                    </div>
                  )}
                </div>
                {allImages.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                          idx === selectedImageIndex
                            ? "border-cyan-400"
                            : "border-slate-700 hover:border-slate-500"
                        }`}
                        data-testid={`button-thumbnail-${idx}`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-slate-800/50 border border-slate-700 h-[400px] sm:h-[500px] flex items-center justify-center">
                <span className="text-slate-500 text-lg">No image available</span>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col"
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3" data-testid="text-product-name">
              {product.name}
            </h1>
            {product.tagline && (
              <p className="text-lg text-cyan-400 mb-4" data-testid="text-product-tagline">
                {product.tagline}
              </p>
            )}

            <div className="flex items-baseline gap-3 mb-6">
              {product.salePrice ? (
                <>
                  <span className="text-4xl font-bold text-cyan-400" data-testid="text-product-price">
                    ${(product.salePrice / 100).toLocaleString()}
                  </span>
                  <span className="text-xl text-slate-500 line-through" data-testid="text-product-original-price">
                    ${(product.price / 100).toLocaleString()}
                  </span>
                </>
              ) : (
                <span className="text-4xl font-bold text-cyan-400" data-testid="text-product-price">
                  ${(product.price / 100).toLocaleString()}
                </span>
              )}
            </div>

            {product.description && (
              <div
                className="prose prose-invert prose-sm max-w-none mb-6 text-muted-foreground
                  prose-headings:text-foreground prose-strong:text-foreground
                  prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: product.description }}
                data-testid="text-product-description"
              />
            )}

            {product.features && product.features.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Key Features</h3>
                <ul className="space-y-2">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-muted-foreground" data-testid={`text-feature-${idx}`}>
                      <Check className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {product.included && product.included.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-3">What's Included</h3>
                <ul className="space-y-2">
                  {product.included.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-muted-foreground" data-testid={`text-included-${idx}`}>
                      <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-auto pt-6 border-t border-slate-700/50">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-muted-foreground">Quantity:</span>
                <div className="flex items-center border border-slate-700 rounded-lg">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="p-2 hover:bg-slate-800 transition-colors rounded-l-lg"
                    disabled={quantity <= 1}
                    data-testid="button-quantity-decrease"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 min-w-[3rem] text-center font-medium" data-testid="text-quantity">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="p-2 hover:bg-slate-800 transition-colors rounded-r-lg"
                    data-testid="button-quantity-increase"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-lg h-14"
                onClick={handleAddToCart}
                data-testid="button-add-to-cart"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart — ${(((product.salePrice || product.price) * quantity) / 100).toLocaleString()}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </SiteLayout>
  );
}
