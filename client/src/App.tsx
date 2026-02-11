import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense, useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ThemeProvider from "@/components/ThemeProvider";
import { AdminThemeProvider } from "@/hooks/use-admin-theme";
import CmsErrorBoundary from "@/components/CmsErrorBoundary";
import { initGAFromSettings } from "@/lib/analytics";
import { useAnalytics } from "@/hooks/use-analytics";

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
import Checkout from "@/pages/checkout";
import OrderSuccess from "@/pages/order-success";
import TrackOrder from "@/pages/track-order";
import MyAccount from "@/pages/my-account";
import CustomerLogin from "@/pages/customer-login";
import CustomerRegister from "@/pages/customer-register";
import PageView from "@/pages/page-view";
import Shop from "@/pages/shop";
import NotFound from "@/pages/not-found";

const BlogIndexPage = lazyRetry(() => import("@/blog/BlogIndexPage"));
const BlogPostPage = lazyRetry(() => import("@/blog/BlogPostPage"));
const BetterAuthLogin = lazyRetry(() => import("@/pages/better-auth-login"));
const BetterAuthRegister = lazyRetry(() => import("@/pages/better-auth-register"));
const BecomeAffiliate = lazyRetry(() => import("@/pages/become-affiliate"));
const AffiliatePortal = lazyRetry(() => import("@/pages/affiliate-portal"));
const ResetPassword = lazyRetry(() => import("@/pages/reset-password"));
const OrderStatusPage = lazyRetry(() => import("@/pages/order-status"));

const AdminSetup = lazyRetry(() => import("@/pages/admin-setup"));
const AdminLogin = lazyRetry(() => import("@/pages/admin-login"));
const AdminForgotPassword = lazyRetry(() => import("@/pages/admin-forgot-password"));
const AdminResetPassword = lazyRetry(() => import("@/pages/admin-reset-password"));
const AdminDashboard = lazyRetry(() => import("@/pages/admin-dashboard"));
const AdminOrders = lazyRetry(() => import("@/pages/admin-orders"));
const AdminProducts = lazyRetry(() => import("@/pages/admin-products"));
const AdminSettings = lazyRetry(() => import("@/pages/admin-settings"));
const AdminTeam = lazyRetry(() => import("@/pages/admin-team"));
const AdminCustomers = lazyRetry(() => import("@/pages/admin-customers"));
const AdminUserManagement = lazyRetry(() => import("@/pages/admin-user-management"));
const AdminAffiliates = lazyRetry(() => import("@/pages/admin-affiliates"));
const AdminAffiliateSettings = lazyRetry(() => import("@/pages/admin-affiliate-settings"));
const AdminCoupons = lazyRetry(() => import("@/pages/admin-coupons"));
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return null;
}

function LazyFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
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
        <Route path="/become-affiliate" component={BecomeAffiliate} />
        <Route path="/affiliate-portal" component={AffiliatePortal} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/blog/:slug">{() => <BlogPostPage />}</Route>
        <Route path="/blog">{() => <BlogIndexPage />}</Route>
        <Route path="/page/:slug" component={PageView} />
        <Route path="/admin" component={AdminRedirect} />
        <Route path="/admin/setup" component={AdminSetup} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/forgot-password" component={AdminForgotPassword} />
        <Route path="/admin/reset-password" component={AdminResetPassword} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/team" component={AdminTeam} />
        <Route path="/admin/customers" component={AdminCustomers} />
        <Route path="/admin/user-management" component={AdminUserManagement} />
        <Route path="/admin/affiliates" component={AdminAffiliates} />
        <Route path="/admin/affiliate-settings" component={AdminAffiliateSettings} />
        <Route path="/admin/coupons" component={AdminCoupons} />
        <Route path="/admin/reports" component={AdminReports} />
        <Route path="/admin/theme" component={AdminTheme} />
        <Route path="/admin/pages" component={AdminPages} />
        <Route path="/admin/pages/new" component={AdminPageBuilder} />
        <Route path="/admin/pages/:id/edit" component={AdminPageBuilder} />
        <Route path="/admin/shipping" component={AdminShipping} />
        <Route path="/admin/email-templates" component={AdminEmailTemplates} />
        <Route path="/admin/integrations" component={AdminIntegrations} />
        <Route path="/admin/docs" component={AdminDocs} />
        <Route path="/admin/docs-coverage" component={AdminDocsCoverage} />
        <Route path="/admin/revenue" component={AdminRevenue} />
        <Route path="/admin/upsells" component={AdminUpsells} />
        <Route path="/admin/vip" component={AdminVip} />
        <Route path="/admin/recovery" component={AdminRecovery} />
        <Route path="/admin/alerts" component={AdminAlerts} />
        <Route path="/admin/sections" component={AdminSections} />
        <Route path="/admin/media" component={AdminMediaLibrary} />
        <Route path="/admin/support" component={AdminSupport} />
        <Route path="/admin/affiliate-invite-sender" component={AdminAffiliateInviteSender} />
        <Route path="/admin/cms/posts/new">{() => <CmsErrorBoundary><AdminCmsPostEditor /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/posts/:id/edit">{() => <CmsErrorBoundary><AdminCmsPostEditor /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/posts/:id/builder">{() => <CmsErrorBoundary><AdminCmsPostBuilder /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/posts">{() => <CmsErrorBoundary><AdminCmsPosts /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/menus">{() => <CmsErrorBoundary><AdminCmsMenus /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/sidebars">{() => <CmsErrorBoundary><AdminCmsSidebars /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/presets">{() => <CmsErrorBoundary><AdminCmsPresets /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/generator/campaigns">{() => <CmsErrorBoundary><AdminCmsGeneratorCampaigns /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/generator/landing">{() => <CmsErrorBoundary><AdminCmsGeneratorLanding /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/pages/:id/builder">{() => <CmsErrorBoundary><AdminCmsBuilder /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/pages/:id/edit">{() => <CmsErrorBoundary><AdminCmsPageEdit /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/pages">{() => <CmsErrorBoundary><AdminCmsPages /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/sections">{() => { window.location.replace("/admin/cms/templates?tab=sections"); return null; }}</Route>
        <Route path="/admin/cms/templates">{() => <CmsErrorBoundary><AdminCmsTemplates /></CmsErrorBoundary>}</Route>
        <Route path="/admin/settings/themes">{() => <CmsErrorBoundary><AdminCmsThemes /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/themes">{() => { window.location.replace("/admin/settings/themes"); return null; }}</Route>
        <Route path="/admin/cms/media">{() => { window.location.replace("/admin/media"); return null; }}</Route>
        <Route path="/admin/cms/seo">{() => <CmsErrorBoundary><AdminCmsSeo /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms/settings">{() => <CmsErrorBoundary><AdminCmsSettings /></CmsErrorBoundary>}</Route>
        <Route path="/admin/cms">{() => <CmsErrorBoundary><AdminCms /></CmsErrorBoundary>}</Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    initGAFromSettings();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AdminThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AdminThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
