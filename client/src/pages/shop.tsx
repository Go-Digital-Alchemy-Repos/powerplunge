import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageRenderer from "@/components/PageRenderer";
import DynamicNav from "@/components/DynamicNav";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { trackAddToCart, trackViewItemList } from "@/lib/analytics";

interface Product {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  price: number;
  salePrice?: number;
  primaryImage?: string;
  features?: string[];
  urlSlug?: string;
}

interface PageContentJson {
  version: number;
  blocks: Array<{
    id: string;
    type: string;
    data: Record<string, any>;
    settings?: Record<string, any>;
  }>;
}

interface ShopPage {
  id: string;
  title: string;
  contentJson: PageContentJson | null;
  content: string | null;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function Shop() {
  const [, navigate] = useLocation();
  const { customer } = useCustomerAuth();
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

  const { data: shopPage, isLoading: pageLoading } = useQuery<ShopPage>({
    queryKey: ["/api/pages/shop"],
    retry: false,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: siteSettings } = useQuery<{ featuredProductId?: string }>({
    queryKey: ["/api/site-settings"],
  });

  useEffect(() => {
    if (products.length > 0) {
      trackViewItemList(
        "Shop Page",
        products.map((p) => ({ id: p.id, name: p.name, price: p.price / 100 })),
      );
    }
  }, [products]);

  const handleAddToCart = (productId: string, quantity: number = 1) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    trackAddToCart({
      id: product.id,
      name: product.name,
      price: (product.salePrice || product.price) / 100,
      quantity,
    });

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productId);
      if (existingItem) {
        return prevCart.map(item => 
          item.id === productId 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, {
        id: product.id,
        name: product.name,
        price: product.salePrice || product.price,
        quantity,
        image: product.primaryImage || '',
      }];
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (pageLoading || productsLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasPageContent = shopPage?.contentJson?.blocks && shopPage.contentJson.blocks.length > 0;

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground" data-testid="button-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Shop</h1>
          </div>
          <div className="flex items-center gap-2">
            <DynamicNav location="main" />
            <Button
              onClick={() => navigate("/checkout")}
              className="bg-cyan-500 hover:bg-cyan-600 text-black"
              disabled={cart.length === 0}
              data-testid="button-cart"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {cartCount > 0 && <span className="mr-2">{cartCount}</span>}
              ${(cartTotal / 100).toFixed(2)}
            </Button>
          </div>
        </div>
      </header>

      {hasPageContent ? (
        <PageRenderer
          contentJson={shopPage?.contentJson}
          legacyContent={shopPage?.content}
          onAddToCart={handleAddToCart}
        />
      ) : (
        <FallbackShopContent 
          products={products} 
          featuredProductId={siteSettings?.featuredProductId}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
}

function FallbackShopContent({ 
  products, 
  featuredProductId,
  onAddToCart 
}: { 
  products: Product[]; 
  featuredProductId?: string;
  onAddToCart: (productId: string, quantity: number) => void;
}) {
  const featuredProduct = featuredProductId 
    ? products.find(p => p.id === featuredProductId) 
    : products[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Our Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => {
            const productUrl = product.urlSlug ? `/products/${product.urlSlug}` : null;
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-colors group"
                data-testid={`product-card-${product.id}`}
              >
                {productUrl ? (
                  <Link href={productUrl} className="block cursor-pointer">
                    {product.primaryImage && (
                      <img 
                        src={product.primaryImage} 
                        alt={product.name}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <div className="p-6 pb-3">
                      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">{product.name}</h3>
                      {product.tagline && (
                        <p className="text-slate-400 text-sm mb-2">{product.tagline}</p>
                      )}
                    </div>
                  </Link>
                ) : (
                  <>
                    {product.primaryImage && (
                      <img 
                        src={product.primaryImage} 
                        alt={product.name}
                        className="w-full h-64 object-cover"
                      />
                    )}
                    <div className="p-6 pb-3">
                      <h3 className="text-xl font-semibold text-white mb-2">{product.name}</h3>
                      {product.tagline && (
                        <p className="text-slate-400 text-sm mb-2">{product.tagline}</p>
                      )}
                    </div>
                  </>
                )}
                <div className="px-6 pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      {product.salePrice ? (
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-cyan-400">
                            ${(product.salePrice / 100).toLocaleString()}
                          </span>
                          <span className="text-sm text-slate-500 line-through">
                            ${(product.price / 100).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xl font-bold text-cyan-400">
                          ${(product.price / 100).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <Button 
                      className="bg-cyan-500 hover:bg-cyan-600 text-black"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddToCart(product.id, 1);
                      }}
                      data-testid={`add-to-cart-${product.id}`}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {products.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-400 text-lg">No products available yet.</p>
        </div>
      )}
    </div>
  );
}
