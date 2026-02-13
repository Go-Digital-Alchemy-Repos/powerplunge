import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense, useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ThemeProvider from "@/components/ThemeProvider";
import { AdminThemeProvider } from "@/hooks/use-admin-theme";
import CmsErrorBoundary from "@/components/CmsErrorBoundary";
import AdminGuard from "@/components/admin/AdminGuard";
import { initGAFromSettings } from "@/lib/analytics";
import { useAnalytics } from "@/hooks/use-analytics";
import { getStoredConsent } from "@/lib/consent";
import ConsentBanner from "@/components/ConsentBanner";

function lazyRetry(importFn: () => Promise<any>) {
  return lazy(() =>
    importFn().catch(() => {
      const hasReloaded = sessionStorage.getItem("chunk_reload");
      if (!hasReloaded) {
        sessionStorage.setItem("chunk_reload", "1");
        window.location.reload();
        return { default: () => null };
      }
      sessionStorage.removeItem("chunk_reload");
      return importFn();
    })
  );
}

import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

const Checkout = lazyRetry(() => import("@/pages/checkout"));
const OrderSuccess = lazyRetry(() => import("@/pages/order-success"));
const TrackOrder = lazyRetry(() => import("@/pages/track-order"));
const MyAccount = lazyRetry(() => import("@/pages/my-account"));
const CustomerLogin = lazyRetry(() => import("@/pages/customer-login"));
const CustomerRegister = lazyRetry(() => import("@/pages/customer-register"));
const PageView = lazyRetry(() => import("@/pages/page-view"));
const Shop = lazyRetry(() => import("@/pages/shop"));
const ProductDetail = lazyRetry(() => import("@/pages/product-detail"));

const BlogIndexPage = lazyRetry(() => import("@/blog/BlogIndexPage"));
const BlogPostPage = lazyRetry(() => import("@/blog/BlogPostPage"));
const BetterAuthLogin = lazyRetry(() => import("@/pages/better-auth-login"));
const BetterAuthRegister = lazyRetry(() => import("@/pages/better-auth-register"));
const BecomeAffiliate = lazyRetry(() => import("@/pages/become-affiliate"));
const AffiliatePortal = lazyRetry(() => import("@/pages/affiliate-portal"));
const ResetPassword = lazyRetry(() => import("@/pages/reset-password"));
const OrderStatusPage = lazyRetry(() => import("@/pages/order-status"));
const LegalPage = lazyRetry(() => import("@/pages/legal-page"));

const AdminSetup = lazyRetry(() => import("@/pages/admin-setup"));
const AdminLogin = lazyRetry(() => import("@/pages/admin-login"));
const AdminForgotPassword = lazyRetry(() => import("@/pages/admin-forgot-password"));
const AdminResetPassword = lazyRetry(() => import("@/pages/admin-reset-password"));
const AdminDashboard = lazyRetry(() => import("@/pages/admin-dashboard"));
const AdminOrders = lazyRetry(() => import("@/pages/admin-orders"));
const AdminProducts = lazyRetry(() => import("@/pages/admin-products"));
const AdminSettings = lazyRetry(() => import("@/pages/admin-settings"));
const AdminAnalytics = lazyRetry(() => import("@/pages/admin-analytics"));
const AdminTeam = lazyRetry(() => import("@/pages/admin-team"));
const AdminCustomers = lazyRetry(() => import("@/pages/admin-customers"));
const AdminUserManagement = lazyRetry(() => import("@/pages/admin-user-management"));
const AdminAffiliates = lazyRetry(() => import("@/pages/admin-affiliates"));
const AdminAffiliateSettings = lazyRetry(() => import("@/pages/admin-affiliate-settings"));
const AdminCoupons = lazyRetry(() => import("@/pages/admin-coupons"));
const AdminAccount = lazyRetry(() => import("@/pages/admin-account"));
const AdminReports = lazyRetry(() => import("@/pages/admin-reports"));
const AdminTheme = lazyRetry(() => import("@/pages/admin-theme"));
const AdminPages = lazyRetry(() => import("@/pages/admin-pages"));
const AdminPageBuilder = lazyRetry(() => import("@/pages/admin-page-builder"));
const AdminShipping = lazyRetry(() => import("@/pages/admin-shipping"));
const AdminEmailTemplates = lazyRetry(() => import("@/pages/admin-email-templates"));
const AdminIntegrations = lazyRetry(() => import("@/pages/admin-integrations"));
const AdminDocs = lazyRetry(() => import("@/pages/admin-docs"));
const AdminDocsCoverage = lazyRetry(() => import("@/pages/admin-docs-coverage"));
const AdminRevenue = lazyRetry(() => import("@/pages/admin-revenue"));
const AdminSupport = lazyRetry(() => import("@/pages/admin-support"));
const AdminEcommerceSettings = lazyRetry(() => import("@/pages/admin-ecommerce-settings"));
const AdminUpsells = lazyRetry(() => import("@/pages/admin-upsells"));
const AdminVip = lazyRetry(() => import("@/pages/admin-vip"));
const AdminRecovery = lazyRetry(() => import("@/pages/admin-recovery"));
const AdminAlerts = lazyRetry(() => import("@/pages/admin-alerts"));
const AdminSections = lazyRetry(() => import("@/pages/admin-sections"));
const AdminMediaLibrary = lazyRetry(() => import("@/pages/admin-media-library"));
const AdminAffiliateInviteSender = lazyRetry(() => import("@/pages/admin-affiliate-invite-sender"));
const AdminCms = lazyRetry(() => import("@/pages/admin-cms"));
const AdminCmsPages = lazyRetry(() => import("@/pages/admin-cms-pages"));
const AdminCmsPageEdit = lazyRetry(() => import("@/pages/admin-cms-page-edit"));
const AdminCmsSections = lazyRetry(() => import("@/pages/admin-cms-sections"));
const AdminCmsTemplates = lazyRetry(() => import("@/pages/admin-cms-templates"));
const AdminCmsThemes = lazyRetry(() => import("@/pages/admin-cms-themes"));
const AdminCmsSeo = lazyRetry(() => import("@/pages/admin-cms-seo"));
const AdminCmsSettings = lazyRetry(() => import("@/pages/admin-cms-settings"));
const AdminCmsBuilder = lazyRetry(() => import("@/pages/admin-cms-builder"));
const AdminCmsGeneratorLanding = lazyRetry(() => import("@/pages/admin-cms-generator-landing"));
const AdminCmsGeneratorCampaigns = lazyRetry(() => import("@/pages/admin-cms-generator-campaigns"));
const AdminCmsPresets = lazyRetry(() => import("@/pages/admin-cms-presets"));
const AdminCmsPosts = lazyRetry(() => import("@/pages/admin-cms-posts"));
const AdminCmsPostEditor = lazyRetry(() => import("@/pages/admin-cms-post-editor"));
const AdminCmsPostBuilder = lazyRetry(() => import("@/pages/admin-cms-post-builder"));
const AdminCmsMenus = lazyRetry(() => import("@/pages/admin-cms-menus"));
const AdminCmsSidebars = lazyRetry(() => import("@/pages/admin-cms-sidebars"));

function AdminRedirect() {
  const [, setLocation] = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/me", { credentials: "include" }),
      fetch("/api/admin/check-setup"),
    ])
      .then(async ([meRes, setupRes]) => {
        const setupData = await setupRes.json().catch(() => ({ needsSetup: false }));
        if (setupData.needsSetup) {
          setLocation("/admin/setup", { replace: true });
        } else if (meRes.ok) {
          setLocation("/admin/dashboard", { replace: true });
        } else {
          setLocation("/admin/login", { replace: true });
        }
      })
      .catch(() => {
        setLocation("/admin/login", { replace: true });
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return null;
}

function LazyFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function Router() {
  useAnalytics();

  return (
    <Suspense fallback={<LazyFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/order-success" component={OrderSuccess} />
        <Route path="/track-order" component={TrackOrder} />
        <Route path="/order-status/:orderId" component={OrderStatusPage} />
        <Route path="/my-account" component={MyAccount} />
        <Route path="/login" component={CustomerLogin} />
        <Route path="/register" component={CustomerRegister} />
        <Route path="/auth/login" component={BetterAuthLogin} />
        <Route path="/auth/register" component={BetterAuthRegister} />
        <Route path="/shop" component={Shop} />
        <Route path="/products/:slug" component={ProductDetail} />
        <Route path="/become-affiliate" component={BecomeAffiliate} />
        <Route path="/affiliate-portal" component={AffiliatePortal} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/blog/:slug">{() => <BlogPostPage />}</Route>
        <Route path="/blog">{() => <BlogIndexPage />}</Route>
        <Route path="/privacy-policy" component={LegalPage} />
        <Route path="/terms-and-conditions" component={LegalPage} />
        <Route path="/page/:slug" component={PageView} />
        <Route path="/admin" component={AdminRedirect} />
        <Route path="/admin/setup" component={AdminSetup} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/forgot-password" component={AdminForgotPassword} />
        <Route path="/admin/reset-password" component={AdminResetPassword} />
        <Route path="/admin/dashboard">{() => <AdminGuard><AdminDashboard /></AdminGuard>}</Route>
        <Route path="/admin/orders">{() => <AdminGuard><AdminOrders /></AdminGuard>}</Route>
        <Route path="/admin/products">{() => <AdminGuard><AdminProducts /></AdminGuard>}</Route>
        <Route path="/admin/account">{() => <AdminGuard><AdminAccount /></AdminGuard>}</Route>
        <Route path="/admin/settings">{() => <AdminGuard><AdminSettings /></AdminGuard>}</Route>
        <Route path="/admin/analytics">{() => <AdminGuard><AdminAnalytics /></AdminGuard>}</Route>
        <Route path="/admin/team">{() => <AdminGuard><AdminTeam /></AdminGuard>}</Route>
        <Route path="/admin/customers">{() => <AdminGuard><AdminCustomers /></AdminGuard>}</Route>
        <Route path="/admin/user-management">{() => <AdminGuard><AdminUserManagement /></AdminGuard>}</Route>
        <Route path="/admin/affiliates">{() => <AdminGuard><AdminAffiliates /></AdminGuard>}</Route>
        <Route path="/admin/affiliate-settings">{() => <AdminGuard><AdminAffiliateSettings /></AdminGuard>}</Route>
        <Route path="/admin/coupons">{() => <AdminGuard><AdminCoupons /></AdminGuard>}</Route>
        <Route path="/admin/reports">{() => <AdminGuard><AdminReports /></AdminGuard>}</Route>
        <Route path="/admin/theme">{() => <AdminGuard><AdminTheme /></AdminGuard>}</Route>
        <Route path="/admin/pages">{() => <AdminGuard><AdminPages /></AdminGuard>}</Route>
        <Route path="/admin/pages/new">{() => <AdminGuard><AdminPageBuilder /></AdminGuard>}</Route>
        <Route path="/admin/pages/:id/edit">{() => <AdminGuard><AdminPageBuilder /></AdminGuard>}</Route>
        <Route path="/admin/shipping">{() => <AdminGuard><AdminShipping /></AdminGuard>}</Route>
        <Route path="/admin/email-templates">{() => <AdminGuard><AdminEmailTemplates /></AdminGuard>}</Route>
        <Route path="/admin/integrations">{() => <AdminGuard><AdminIntegrations /></AdminGuard>}</Route>
        <Route path="/admin/docs">{() => <AdminGuard><AdminDocs /></AdminGuard>}</Route>
        <Route path="/admin/docs-coverage">{() => <AdminGuard><AdminDocsCoverage /></AdminGuard>}</Route>
        <Route path="/admin/revenue">{() => <AdminGuard><AdminRevenue /></AdminGuard>}</Route>
        <Route path="/admin/upsells">{() => <AdminGuard><AdminUpsells /></AdminGuard>}</Route>
        <Route path="/admin/vip">{() => <AdminGuard><AdminVip /></AdminGuard>}</Route>
        <Route path="/admin/recovery">{() => <AdminGuard><AdminRecovery /></AdminGuard>}</Route>
        <Route path="/admin/alerts">{() => <AdminGuard><AdminAlerts /></AdminGuard>}</Route>
        <Route path="/admin/sections">{() => <AdminGuard><AdminSections /></AdminGuard>}</Route>
        <Route path="/admin/media">{() => <AdminGuard><AdminMediaLibrary /></AdminGuard>}</Route>
        <Route path="/admin/support">{() => <AdminGuard><AdminSupport /></AdminGuard>}</Route>
        <Route path="/admin/ecommerce/settings">{() => <AdminGuard><AdminEcommerceSettings /></AdminGuard>}</Route>
        <Route path="/admin/affiliate-invite-sender">{() => <AdminGuard><AdminAffiliateInviteSender /></AdminGuard>}</Route>
        <Route path="/admin/cms/posts/new">{() => <AdminGuard><CmsErrorBoundary><AdminCmsPostEditor /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/posts/:id/edit">{() => <AdminGuard><CmsErrorBoundary><AdminCmsPostEditor /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/posts/:id/builder">{() => <AdminGuard><CmsErrorBoundary><AdminCmsPostBuilder /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/posts">{() => <AdminGuard><CmsErrorBoundary><AdminCmsPosts /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/menus">{() => <AdminGuard><CmsErrorBoundary><AdminCmsMenus /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/sidebars">{() => <AdminGuard><CmsErrorBoundary><AdminCmsSidebars /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/presets">{() => <AdminGuard><CmsErrorBoundary><AdminCmsPresets /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/generator/campaigns">{() => <AdminGuard><CmsErrorBoundary><AdminCmsGeneratorCampaigns /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/generator/landing">{() => <AdminGuard><CmsErrorBoundary><AdminCmsGeneratorLanding /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/pages/:id/builder">{() => <AdminGuard><CmsErrorBoundary><AdminCmsBuilder /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/pages/:id/edit">{() => <AdminGuard><CmsErrorBoundary><AdminCmsPageEdit /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/pages">{() => <AdminGuard><CmsErrorBoundary><AdminCmsPages /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/sections">{() => { window.location.replace("/admin/cms/templates?tab=sections"); return null; }}</Route>
        <Route path="/admin/cms/templates">{() => <AdminGuard><CmsErrorBoundary><AdminCmsTemplates /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/settings/themes">{() => <AdminGuard><CmsErrorBoundary><AdminCmsThemes /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/themes">{() => { window.location.replace("/admin/settings/themes"); return null; }}</Route>
        <Route path="/admin/cms/media">{() => { window.location.replace("/admin/media"); return null; }}</Route>
        <Route path="/admin/cms/seo">{() => <AdminGuard><CmsErrorBoundary><AdminCmsSeo /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms/settings">{() => <AdminGuard><CmsErrorBoundary><AdminCmsSettings /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route path="/admin/cms">{() => <AdminGuard><CmsErrorBoundary><AdminCms /></CmsErrorBoundary></AdminGuard>}</Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function useConsentAwareGA() {
  useEffect(() => {
    const loadGA = async () => {
      try {
        const res = await fetch("/api/site-settings/consent");
        const consent = await res.json();
        if (consent.enabled) {
          const stored = getStoredConsent();
          if (consent.mode === "opt_out") {
            if (!stored || stored.categories.analytics !== false) {
              initGAFromSettings();
            }
          } else {
            if (stored?.categories?.analytics === true) {
              initGAFromSettings();
            }
          }
        } else {
          initGAFromSettings();
        }
      } catch {
        initGAFromSettings();
      }
    };
    loadGA();

    const handleConsentUpdate = () => {
      const stored = getStoredConsent();
      if (stored?.categories?.analytics) {
        initGAFromSettings();
      }
    };
    window.addEventListener("consent-updated", handleConsentUpdate);
    return () => window.removeEventListener("consent-updated", handleConsentUpdate);
  }, []);
}

function DynamicFavicon() {
  const { data } = useQuery<{ faviconUrl?: string | null }>({
    queryKey: ["/api/site-settings"],
    staleTime: 5 * 60 * 1000,
    select: (d: any) => ({ faviconUrl: d?.faviconUrl }),
  });

  useEffect(() => {
    if (data?.faviconUrl) {
      const iconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      const appleLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
      if (iconLink) iconLink.href = data.faviconUrl;
      if (appleLink) appleLink.href = data.faviconUrl;
    }
  }, [data?.faviconUrl]);

  return null;
}

function App() {
  useConsentAwareGA();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AdminThemeProvider>
          <TooltipProvider>
            <DynamicFavicon />
            <Toaster />
            <Router />
            <ConsentBanner />
          </TooltipProvider>
        </AdminThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
