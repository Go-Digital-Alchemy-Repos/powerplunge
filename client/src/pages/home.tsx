import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { openConsentPreferences } from "@/components/ConsentBanner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, ShoppingCart, Zap, Shield, Snowflake, Timer, X, Plus, Minus, Truck, Award, HeartPulse, Dumbbell, Building2, Sparkles, ThermometerSnowflake, Volume2, Filter, Gauge, User, LogOut, Settings, Link2, Headphones, Package, LayoutDashboard } from "lucide-react";
import DynamicNav from "@/components/DynamicNav";
import CartUpsells from "@/components/CartUpsells";
import PageRenderer from "@/components/PageRenderer";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useAdmin } from "@/hooks/use-admin";
import { trackAddToCart, trackViewItem, trackViewItemList } from "@/lib/analytics";
import chillerImage from "@assets/power_plunge_1hp_chiller_mockup_1767902865789.png";
import tubImage from "@assets/power_plunge_portable_tub_mockup_1767902865790.png";
import { useBranding } from "@/hooks/use-branding";
import heroImage from "@assets/hero_1767910221674.jpg";

interface PageContentJson {
  version: number;
  blocks: Array<{
    id: string;
    type: string;
    data: Record<string, any>;
    settings?: Record<string, any>;
  }>;
}

interface HomePage {
  id: string;
  title: string;
  contentJson: PageContentJson | null;
  content: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  twitterCard?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImage?: string | null;
  jsonLd?: any;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

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
  features: string[];
  included: string[];
}

const productImages = [tubImage, chillerImage];

const fallbackProduct = {
  id: "power-plunge-portable-tub",
  name: "Power Plunge™ Portable Cold Plunge Tub",
  tagline: "Professional-Grade Cold Therapy. Anywhere.",
  price: 149900,
  description: "Take your recovery to the next level with the Power Plunge™ Portable Cold Plunge Tub—a premium, insulated cold plunge system designed for home users, athletes, gyms, and recovery centers. Powered by a 1HP professional-grade chiller, Power Plunge delivers consistent, ice-cold water temperatures without the hassle of ice or complicated setups.",
  features: [
    "Reaches temperatures as low as 30°F",
    "Insulated tub walls for superior temperature retention",
    "Built-in filtration system",
    "Digital temperature controls",
    "Quiet operation",
    "Easy-drain design",
  ],
  included: [
    "Power Plunge™ insulated portable tub",
    "Thermal locking lid",
    "1HP chiller unit",
    "Integrated filtration system",
    "Drain hose",
    "Power supply and connection hardware",
  ],
};

export default function Home() {
  const [, setLocation] = useLocation();
  const { logoSrc, companyName } = useBranding();
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("cart");
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [product, setProduct] = useState<Product>(fallbackProduct);
  const [quantity, setQuantity] = useState(1);
  const { customer, isLoading: authLoading, isAuthenticated, logout, getAuthHeader } = useCustomerAuth();
  const { admin, isAuthenticated: isAdminAuthenticated } = useAdmin();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isAuthenticated && customer?.id) {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/affiliate-portal"] });
    }
    if (!isAuthenticated) {
      queryClient.removeQueries({ queryKey: ["/api/customer/affiliate-portal"] });
    }
  }, [isAuthenticated, customer?.id, queryClient]);

  const { data: homePage, isLoading: isHomePageLoading } = useQuery<HomePage>({
    queryKey: ["/api/pages/home"],
    retry: false,
  });

  const { data: affiliateData } = useQuery<{ affiliate: { id: string; status: string } | null }>({
    queryKey: ["/api/customer/affiliate-portal", customer?.id],
    queryFn: async () => {
      const res = await fetch("/api/customer/affiliate-portal", { 
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) return { affiliate: null };
      return res.json();
    },
    enabled: isAuthenticated,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const isAffiliate = !!affiliateData?.affiliate;

  const { data: siteSettings } = useQuery<{ featuredProductId?: string }>({
    queryKey: ["/api/site-settings"],
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Show CMS content if available, otherwise show fallback
  const hasCmsContent = !isHomePageLoading && homePage?.contentJson?.blocks && homePage.contentJson.blocks.length > 0;
  const showFallbackPage = !hasCmsContent;

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (siteSettings?.featuredProductId && allProducts.length > 0) {
      const featured = allProducts.find(p => p.id === siteSettings.featuredProductId);
      if (featured) {
        setProduct(featured);
        return;
      }
    }
    if (allProducts.length > 0) {
      setProduct(allProducts[0]);
    }
  }, [siteSettings, allProducts]);

  // Capture referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("affiliateCode", refCode);
      localStorage.setItem("affiliateCodeExpiry", String(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days
    }
  }, []);

  const handleCheckout = () => {
    localStorage.setItem("cart", JSON.stringify(cart));
    setLocation("/checkout");
  };

  const displayPrice = product.price / 100;
  const isOnSale = product.discountType && product.discountType !== "NONE" && product.salePrice;
  const saleDisplayPrice = product.salePrice ? product.salePrice / 100 : null;
  const savingsAmount = isOnSale && saleDisplayPrice ? displayPrice - saleDisplayPrice : 0;
  const savingsPercent = isOnSale && product.discountType === "PERCENT" && product.discountValue ? product.discountValue : Math.round((savingsAmount / displayPrice) * 100);

  const whatsIncluded = product.included?.length > 0 ? product.included : fallbackProduct.included;

  const featureIcons = [ThermometerSnowflake, Shield, Filter, Gauge, Volume2, Zap];
  const keyFeatures = (product.features?.length > 0 ? product.features : fallbackProduct.features).map((text, i) => ({
    icon: featureIcons[i % featureIcons.length],
    text,
  }));

  const addToCart = () => {
    if (!product.id) return;
    trackAddToCart({
      id: product.id,
      name: product.name,
      price: (product.salePrice || product.price) / 100,
      quantity,
    });
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity, image: tubImage }];
    });
    setIsCartOpen(true);
    setQuantity(1);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img src={logoSrc} alt={companyName} className="h-10" data-testid="img-logo" />
          </div>
          <div className="flex items-center gap-2">
            <DynamicNav location="main" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-my-account">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">My Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {authLoading ? (
                  <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                ) : isAuthenticated ? (
                  <>
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {customer?.email}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation("/my-account")} data-testid="menu-my-orders">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      My Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/my-account")} data-testid="menu-account-details">
                      <Settings className="w-4 h-4 mr-2" />
                      Account Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/my-account")} data-testid="menu-support">
                      <Headphones className="w-4 h-4 mr-2" />
                      Support
                    </DropdownMenuItem>
                    {isAffiliate && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setLocation("/affiliate-portal")} data-testid="menu-affiliate-dashboard">
                          <Link2 className="w-4 h-4 mr-2 text-primary" />
                          Affiliate Portal
                        </DropdownMenuItem>
                      </>
                    )}
                    {isAdminAuthenticated && (admin?.role === "super_admin" || admin?.role === "admin" || admin?.role === "store_manager") && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setLocation("/admin/dashboard")} data-testid="menu-admin-dashboard">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </DropdownMenuItem>
                      </>
                    )}
                    {isAdminAuthenticated && admin?.role === "fulfillment" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setLocation("/admin/orders")} data-testid="menu-fulfillment">
                          <Package className="w-4 h-4 mr-2" />
                          Fulfillment
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()} data-testid="menu-logout">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => setLocation("/login")} data-testid="menu-login">
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="relative gap-2"
              onClick={() => setIsCartOpen(true)}
              data-testid="button-cart"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-semibold">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Show loading state while fetching CMS content */}
      {isHomePageLoading && (
        <div className="min-h-screen flex items-center justify-center pt-20">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      )}

      {/* Render CMS content if available */}
      {hasCmsContent && (
        <div className="pt-20">
          <PageRenderer
            contentJson={homePage?.contentJson}
            legacyContent={homePage?.content}
            onAddToCart={(productId, qty) => {
              let prod = allProducts.find(p => p.id === productId);
              if (!prod && siteSettings?.featuredProductId) {
                prod = allProducts.find(p => p.id === siteSettings.featuredProductId);
              }
              if (!prod && allProducts.length > 0) {
                prod = allProducts[0];
              }
              if (prod) {
                setCart((prev) => {
                  const existing = prev.find((item) => item.id === prod!.id);
                  if (existing) {
                    return prev.map((item) =>
                      item.id === prod!.id ? { ...item, quantity: item.quantity + qty } : item
                    );
                  }
                  return [...prev, { id: prod!.id, name: prod!.name, price: prod!.salePrice || prod!.price, quantity: qty, image: prod!.primaryImage || '' }];
                });
                setIsCartOpen(true);
              }
            }}
          />
        </div>
      )}

      {/* Fallback to hardcoded content if CMS content not available */}
      {showFallbackPage && !isHomePageLoading && (
        <>
        <section className="relative min-h-screen flex items-center justify-center pt-20">
          <div className="absolute inset-0">
            <img src={heroImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-primary font-medium tracking-widest uppercase mb-4" data-testid="text-tagline">
                Mind + Body + Spirit
              </p>
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
                Cold. Consistent.
                <span className="block text-gradient-ice">Powerful.</span>
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10">
                Skip the ice bags and inconsistency. The Power Plunge™ Portable Tub delivers reliable, 
                professional-level cold therapy whenever you need it.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="glow-ice-sm text-lg px-8" onClick={addToCart} data-testid="button-shop-now">
                  Order Now
                  <Zap className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8" data-testid="button-learn-more">
                  Learn More
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-20 border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Snowflake, label: "Ice Cold", value: "Down to 30°F" },
              { icon: Timer, label: "No Ice Required", value: "Always Ready" },
              { icon: Truck, label: "Free Shipping", value: "Continental US" },
              { icon: Award, label: "Warranty", value: "2 Year Coverage" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <p className="text-2xl font-display font-bold mb-1" data-testid={`text-stat-value-${i}`}>{stat.value}</p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24" id="why-power-plunge">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Why Choose <span className="text-gradient-ice">Power Plunge™</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Whether you're optimizing recovery, reducing inflammation, or building mental resilience, 
              Power Plunge gives you reliable cold exposure—on demand.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: ThermometerSnowflake,
                title: "Consistent Cold, No Ice Required",
                description: "Achieves and maintains temperatures as low as 30°F using a powerful 1HP chiller. No more buying ice or waiting for it to melt.",
              },
              {
                icon: Shield,
                title: "Premium Insulation & Thermal Lid",
                description: "High-density insulated walls and a thermal locking lid retain cold longer and improve energy efficiency.",
              },
              {
                icon: Zap,
                title: "Portable & Space-Efficient",
                description: "Designed for easy setup, relocation, and use in homes, gyms, garages, or training facilities.",
              },
              {
                icon: Filter,
                title: "Clean Water, Low Maintenance",
                description: "Built-in filtration system keeps water cleaner between sessions, reducing the need for frequent water changes.",
              },
              {
                icon: Gauge,
                title: "Simple Digital Controls",
                description: "Set and monitor your temperature easily with intuitive digital controls for precise cold therapy.",
              },
              {
                icon: Volume2,
                title: "Quiet, Professional Operation",
                description: "Engineered for smooth, quiet performance—ideal for both residential and commercial environments.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-card border-gradient-ice rounded-2xl p-8 relative group hover:scale-[1.02] transition-transform duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:glow-ice-sm transition-shadow">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3" data-testid={`text-feature-title-${i}`}>{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-card/30 border-y border-border" id="product">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              The Complete <span className="text-gradient-ice">System</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need for professional-grade cold therapy at home.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="aspect-square bg-black/50 rounded-3xl overflow-hidden border border-border p-8 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                {isOnSale && (
                  <div className="absolute top-4 left-4 z-20 bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg" data-testid="badge-on-sale">
                    ON SALE
                  </div>
                )}
                <img
                  src={productImages[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain relative z-10"
                  data-testid="img-product-main"
                />
              </div>
              <div className="flex gap-3">
                {productImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-24 h-24 rounded-xl overflow-hidden border-2 transition-all p-2 bg-black/50 ${
                      selectedImage === i ? "border-primary glow-ice-sm" : "border-border hover:border-muted-foreground"
                    }`}
                    data-testid={`button-thumbnail-${i}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <p className="text-primary font-medium tracking-wider uppercase mb-2">Complete Cold Plunge System</p>
                <h3 className="font-display text-3xl md:text-4xl font-bold mb-3" data-testid="text-product-name">
                  {product.name}
                </h3>
                <p className="text-xl text-muted-foreground mb-4">{product.tagline}</p>
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              </div>

              <div>
                <h4 className="font-display text-lg font-semibold mb-4">Key Features</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {keyFeatures.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <feature.icon className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-display text-lg font-semibold mb-4">What's Included</h4>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {whatsIncluded.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Complete System Price</p>
                  {isOnSale && saleDisplayPrice ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline gap-3">
                        <span className="text-muted-foreground line-through text-xl">
                          ${displayPrice.toLocaleString()}
                        </span>
                        <span className="font-display text-4xl font-bold text-red-500" data-testid="text-product-price">
                          ${saleDisplayPrice.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-green-500">
                        Save ${savingsAmount.toLocaleString()} ({savingsPercent}% off)
                      </span>
                    </div>
                  ) : (
                    <p className="font-display text-4xl font-bold text-gradient-ice" data-testid="text-product-price">
                      ${displayPrice.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      data-testid="button-quantity-decrease"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-medium w-8 text-center text-lg" data-testid="text-product-quantity">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10"
                      onClick={() => setQuantity(quantity + 1)}
                      data-testid="button-quantity-increase"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    size="lg"
                    className="glow-ice-sm text-lg px-8"
                    onClick={addToCart}
                    data-testid="button-add-to-cart"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24" id="perfect-for">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Perfect <span className="text-gradient-ice">For</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { icon: Snowflake, title: "Home Cold Plunge Setups" },
              { icon: Dumbbell, title: "Athletes & Fitness Enthusiasts" },
              { icon: Building2, title: "Gyms & Training Facilities" },
              { icon: HeartPulse, title: "Physical Therapy & Recovery" },
              { icon: Sparkles, title: "Wellness Studios & Spas" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-card border border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors"
              >
                <item.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <p className="font-medium" data-testid={`text-perfect-for-${i}`}>{item.title}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-card/30 border-t border-border">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              Elevate Your <span className="text-gradient-ice">Recovery</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
              Skip the ice bags and inconsistency. The Power Plunge™ Portable Tub delivers reliable, 
              professional-level cold therapy whenever you need it—built for performance, convenience, and long-term use.
            </p>
            <Button size="lg" className="glow-ice text-lg px-10 py-6" onClick={addToCart} data-testid="button-get-started">
              Order Your Power Plunge™
              <Zap className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
        </section>
        </>
      )}

      <footer className="py-12 border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
              <img src={logoSrc} alt={companyName} className="h-8" />
            </div>
            <div className="flex flex-col items-center gap-3 md:items-end">
              <div className="flex items-center gap-4">
                <Link href="/privacy-policy" className="text-muted-foreground text-sm hover:text-foreground transition-colors" data-testid="link-privacy-policy">
                  Privacy Policy
                </Link>
                <Link href="/terms-and-conditions" className="text-muted-foreground text-sm hover:text-foreground transition-colors" data-testid="link-terms">
                  Terms & Conditions
                </Link>
                <button onClick={openConsentPreferences} className="text-muted-foreground text-sm hover:text-foreground transition-colors" data-testid="link-cookie-preferences">
                  Cookie Preferences
                </button>
              </div>
              <p className="text-muted-foreground text-sm">
                Mind + Body + Spirit | © 2026 Power Plunge. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {isCartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="font-display text-xl font-bold">Your Cart</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)} data-testid="button-close-cart">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-4 p-4 bg-muted/30 rounded-xl" data-testid={`cart-item-${item.id}`}>
                        <div className="w-20 h-20 bg-black/50 rounded-lg flex-shrink-0 p-2">
                          <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1 text-sm">{item.name}</h4>
                          <p className="text-primary font-bold">${(item.price / 100).toLocaleString()}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-8 h-8"
                              onClick={() => updateQuantity(item.id, -1)}
                              data-testid={`button-decrease-${item.id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="font-medium w-6 text-center" data-testid={`text-quantity-${item.id}`}>{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-8 h-8"
                              onClick={() => updateQuantity(item.id, 1)}
                              data-testid={`button-increase-${item.id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <CartUpsells
                      cartProductIds={cart.map(item => item.id)}
                      onAddToCart={(upsellProduct) => {
                        setCart((prev) => {
                          const existing = prev.find(item => item.id === upsellProduct.id);
                          if (existing) {
                            return prev.map(item =>
                              item.id === upsellProduct.id
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                            );
                          }
                          return [...prev, {
                            id: upsellProduct.id,
                            name: upsellProduct.name,
                            price: upsellProduct.salePrice || upsellProduct.price,
                            quantity: 1,
                            image: upsellProduct.primaryImage || "",
                          }];
                        });
                      }}
                    />
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-border">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-display text-2xl font-bold text-gradient-ice" data-testid="text-cart-total">
                      ${(cartTotal / 100).toLocaleString()}
                    </span>
                  </div>
                  <Button className="w-full glow-ice-sm" size="lg" onClick={handleCheckout} data-testid="button-checkout">
                    Proceed to Checkout
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
