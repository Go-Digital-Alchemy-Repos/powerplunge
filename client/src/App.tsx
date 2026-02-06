import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Checkout from "@/pages/checkout";
import OrderSuccess from "@/pages/order-success";
import TrackOrder from "@/pages/track-order";
import MyAccount from "@/pages/my-account";
import CustomerLogin from "@/pages/customer-login";
import CustomerRegister from "@/pages/customer-register";
import BetterAuthLogin from "@/pages/better-auth-login";
import BetterAuthRegister from "@/pages/better-auth-register";
import AdminLogin from "@/pages/admin-login";
import AdminForgotPassword from "@/pages/admin-forgot-password";
import AdminResetPassword from "@/pages/admin-reset-password";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminOrders from "@/pages/admin-orders";
import AdminProducts from "@/pages/admin-products";
import AdminSettings from "@/pages/admin-settings";
import AdminTeam from "@/pages/admin-team";
import AdminCustomers from "@/pages/admin-customers";
import AdminUserManagement from "@/pages/admin-user-management";
import AdminAffiliates from "@/pages/admin-affiliates";
import AdminAffiliateSettings from "@/pages/admin-affiliate-settings";
import AdminCoupons from "@/pages/admin-coupons";
import AdminReports from "@/pages/admin-reports";
import AdminTheme from "@/pages/admin-theme";
import AdminPages from "@/pages/admin-pages";
import AdminPageBuilder from "@/pages/admin-page-builder";
import AdminShipping from "@/pages/admin-shipping";
import AdminEmailTemplates from "@/pages/admin-email-templates";
import AdminIntegrations from "@/pages/admin-integrations";
import AdminDocs from "@/pages/admin-docs";
import AdminDocsCoverage from "@/pages/admin-docs-coverage";
import AdminRevenue from "@/pages/admin-revenue";
import AdminSupport from "@/pages/admin-support";
import AdminUpsells from "@/pages/admin-upsells";
import AdminVip from "@/pages/admin-vip";
import AdminRecovery from "@/pages/admin-recovery";
import AdminAlerts from "@/pages/admin-alerts";
import AdminSections from "@/pages/admin-sections";
import AdminMediaLibrary from "@/pages/admin-media-library";
import AdminAffiliateInviteSender from "@/pages/admin-affiliate-invite-sender";
import AdminCmsV2 from "@/pages/admin-cms-v2";
import AdminCmsV2Pages from "@/pages/admin-cms-v2-pages";
import AdminCmsV2Sections from "@/pages/admin-cms-v2-sections";
import AdminCmsV2Templates from "@/pages/admin-cms-v2-templates";
import AdminCmsV2Themes from "@/pages/admin-cms-v2-themes";
import AdminCmsV2Seo from "@/pages/admin-cms-v2-seo";
import AdminCmsV2Builder from "@/pages/admin-cms-v2-builder";
import PageView from "@/pages/page-view";
import Shop from "@/pages/shop";
import BecomeAffiliate from "@/pages/become-affiliate";
import AffiliatePortal from "@/pages/affiliate-portal";
import OrderStatusPage from "@/pages/order-status";
import NotFound from "@/pages/not-found";

function Router() {
  return (
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
      <Route path="/admin/cms-v2/pages/:id/builder" component={AdminCmsV2Builder} />
      <Route path="/admin/cms-v2/pages" component={AdminCmsV2Pages} />
      <Route path="/admin/cms-v2/sections" component={AdminCmsV2Sections} />
      <Route path="/admin/cms-v2/templates" component={AdminCmsV2Templates} />
      <Route path="/admin/cms-v2/themes" component={AdminCmsV2Themes} />
      <Route path="/admin/cms-v2/seo" component={AdminCmsV2Seo} />
      <Route path="/admin/cms-v2" component={AdminCmsV2} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
