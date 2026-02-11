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

const BlogIndexPage = lazy(() => import("@/blog/BlogIndexPage"));
const BlogPostPage = lazy(() => import("@/blog/BlogPostPage"));
const BetterAuthLogin = lazy(() => import("@/pages/better-auth-login"));
const BetterAuthRegister = lazy(() => import("@/pages/better-auth-register"));
const BecomeAffiliate = lazy(() => import("@/pages/become-affiliate"));
const AffiliatePortal = lazy(() => import("@/pages/affiliate-portal"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const OrderStatusPage = lazy(() => import("@/pages/order-status"));

const AdminSetup = lazy(() => import("@/pages/admin-setup"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const AdminForgotPassword = lazy(() => import("@/pages/admin-forgot-password"));
const AdminResetPassword = lazy(() => import("@/pages/admin-reset-password"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const AdminOrders = lazy(() => import("@/pages/admin-orders"));
const AdminProducts = lazy(() => import("@/pages/admin-products"));
const AdminSettings = lazy(() => import("@/pages/admin-settings"));
const AdminTeam = lazy(() => import("@/pages/admin-team"));
const AdminCustomers = lazy(() => import("@/pages/admin-customers"));
const AdminUserManagement = lazy(() => import("@/pages/admin-user-management"));
const AdminAffiliates = lazy(() => import("@/pages/admin-affiliates"));
const AdminAffiliateSettings = lazy(() => import("@/pages/admin-affiliate-settings"));
const AdminCoupons = lazy(() => import("@/pages/admin-coupons"));
const AdminReports = lazy(() => import("@/pages/admin-reports"));
const AdminTheme = lazy(() => import("@/pages/admin-theme"));
const AdminPages = lazy(() => import("@/pages/admin-pages"));
const AdminPageBuilder = lazy(() => import("@/pages/admin-page-builder"));
const AdminShipping = lazy(() => import("@/pages/admin-shipping"));
const AdminEmailTemplates = lazy(() => import("@/pages/admin-email-templates"));
const AdminIntegrations = lazy(() => import("@/pages/admin-integrations"));
const AdminDocs = lazy(() => import("@/pages/admin-docs"));
const AdminDocsCoverage = lazy(() => import("@/pages/admin-docs-coverage"));
const AdminRevenue = lazy(() => import("@/pages/admin-revenue"));
const AdminSupport = lazy(() => import("@/pages/admin-support"));
const AdminUpsells = lazy(() => import("@/pages/admin-upsells"));
const AdminVip = lazy(() => import("@/pages/admin-vip"));
const AdminRecovery = lazy(() => import("@/pages/admin-recovery"));
const AdminAlerts = lazy(() => import("@/pages/admin-alerts"));
const AdminSections = lazy(() => import("@/pages/admin-sections"));
const AdminMediaLibrary = lazy(() => import("@/pages/admin-media-library"));
const AdminAffiliateInviteSender = lazy(() => import("@/pages/admin-affiliate-invite-sender"));
const AdminCms = lazy(() => import("@/pages/admin-cms"));
const AdminCmsPages = lazy(() => import("@/pages/admin-cms-pages"));
const AdminCmsPageEdit = lazy(() => import("@/pages/admin-cms-page-edit"));
const AdminCmsSections = lazy(() => import("@/pages/admin-cms-sections"));
const AdminCmsTemplates = lazy(() => import("@/pages/admin-cms-templates"));
const AdminCmsThemes = lazy(() => import("@/pages/admin-cms-themes"));
const AdminCmsSeo = lazy(() => import("@/pages/admin-cms-seo"));
const AdminCmsSettings = lazy(() => import("@/pages/admin-cms-settings"));
const AdminCmsBuilder = lazy(() => import("@/pages/admin-cms-builder"));
const AdminCmsGeneratorLanding = lazy(() => import("@/pages/admin-cms-generator-landing"));
const AdminCmsGeneratorCampaigns = lazy(() => import("@/pages/admin-cms-generator-campaigns"));
const AdminCmsPresets = lazy(() => import("@/pages/admin-cms-presets"));
const AdminCmsPosts = lazy(() => import("@/pages/admin-cms-posts"));
const AdminCmsPostEditor = lazy(() => import("@/pages/admin-cms-post-editor"));
const AdminCmsPostBuilder = lazy(() => import("@/pages/admin-cms-post-builder"));
const AdminCmsMenus = lazy(() => import("@/pages/admin-cms-menus"));
const AdminCmsSidebars = lazy(() => import("@/pages/admin-cms-sidebars"));

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
