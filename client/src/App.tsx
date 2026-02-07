import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ThemeProvider from "@/components/ThemeProvider";
import CmsV2ErrorBoundary from "@/components/CmsV2ErrorBoundary";
import "@/cms/blocks/init";

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

const BetterAuthLogin = lazy(() => import("@/pages/better-auth-login"));
const BetterAuthRegister = lazy(() => import("@/pages/better-auth-register"));
const BecomeAffiliate = lazy(() => import("@/pages/become-affiliate"));
const AffiliatePortal = lazy(() => import("@/pages/affiliate-portal"));
const OrderStatusPage = lazy(() => import("@/pages/order-status"));

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
const AdminCmsV2 = lazy(() => import("@/pages/admin-cms-v2"));
const AdminCmsV2Pages = lazy(() => import("@/pages/admin-cms-v2-pages"));
const AdminCmsV2Sections = lazy(() => import("@/pages/admin-cms-v2-sections"));
const AdminCmsV2Templates = lazy(() => import("@/pages/admin-cms-v2-templates"));
const AdminCmsV2Themes = lazy(() => import("@/pages/admin-cms-v2-themes"));
const AdminCmsV2Seo = lazy(() => import("@/pages/admin-cms-v2-seo"));
const AdminCmsV2Settings = lazy(() => import("@/pages/admin-cms-v2-settings"));
const AdminCmsV2Builder = lazy(() => import("@/pages/admin-cms-v2-builder"));
const AdminCmsV2GeneratorLanding = lazy(() => import("@/pages/admin-cms-v2-generator-landing"));
const AdminCmsV2GeneratorCampaigns = lazy(() => import("@/pages/admin-cms-v2-generator-campaigns"));
const AdminCmsV2Presets = lazy(() => import("@/pages/admin-cms-v2-presets"));
const AdminCmsV2Posts = lazy(() => import("@/pages/admin-cms-v2-posts"));
const AdminCmsV2PostEditor = lazy(() => import("@/pages/admin-cms-v2-post-editor"));
const AdminCmsV2PostBuilder = lazy(() => import("@/pages/admin-cms-v2-post-builder"));
const AdminCmsV2Menus = lazy(() => import("@/pages/admin-cms-v2-menus"));

function LazyFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
    </div>
  );
}

function Router() {
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
        <Route path="/page/:slug" component={PageView} />
        <Route path="/admin" component={AdminLogin} />
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
        <Route path="/admin/cms-v2/posts/new">{() => <CmsV2ErrorBoundary><AdminCmsV2PostEditor /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/posts/:id/edit">{() => <CmsV2ErrorBoundary><AdminCmsV2PostEditor /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/posts/:id/builder">{() => <CmsV2ErrorBoundary><AdminCmsV2PostBuilder /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/posts">{() => <CmsV2ErrorBoundary><AdminCmsV2Posts /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/menus">{() => <CmsV2ErrorBoundary><AdminCmsV2Menus /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/presets">{() => <CmsV2ErrorBoundary><AdminCmsV2Presets /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/generator/campaigns">{() => <CmsV2ErrorBoundary><AdminCmsV2GeneratorCampaigns /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/generator/landing">{() => <CmsV2ErrorBoundary><AdminCmsV2GeneratorLanding /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/pages/:id/builder">{() => <CmsV2ErrorBoundary><AdminCmsV2Builder /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/pages">{() => <CmsV2ErrorBoundary><AdminCmsV2Pages /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/sections">{() => <CmsV2ErrorBoundary><AdminCmsV2Sections /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/templates">{() => <CmsV2ErrorBoundary><AdminCmsV2Templates /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/themes">{() => <CmsV2ErrorBoundary><AdminCmsV2Themes /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/seo">{() => <CmsV2ErrorBoundary><AdminCmsV2Seo /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2/settings">{() => <CmsV2ErrorBoundary><AdminCmsV2Settings /></CmsV2ErrorBoundary>}</Route>
        <Route path="/admin/cms-v2">{() => <CmsV2ErrorBoundary><AdminCmsV2 /></CmsV2ErrorBoundary>}</Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
