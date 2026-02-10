import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Package,
  ShoppingBag,
  Users,
  Link2,
  UserPlus,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Key,
  FileText,
  BarChart3,
  Headset,
  LayoutGrid,
  ImageIcon,
  Sun,
  Moon,
} from "lucide-react";
import { useAdminTheme } from "@/hooks/use-admin-theme";

interface AdminNavProps {
  currentPage?: string;
  role?: "admin" | "store_manager" | "fulfillment";
}

export default function AdminNav({ currentPage, role = "admin" }: AdminNavProps) {
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useAdminTheme();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    navigate("/admin/login");
  };

  const isActive = (page: string) => currentPage === page;
  const isClientManagement = currentPage === "customers" || currentPage === "affiliates" || currentPage === "support" || currentPage === "affiliate-invite-sender";
  const isCms = currentPage === "media" || currentPage === "cms-settings" || currentPage === "cms" || currentPage?.startsWith("cms-");
  const isSettings = currentPage === "settings" || currentPage === "team" || currentPage === "email-templates" || currentPage === "integrations" || currentPage === "docs";

  const hasFullAccess = role === "admin" || role === "store_manager";

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold">Power Plunge Admin</h1>
          <div className="flex gap-2">
            <Link href="/admin/dashboard">
              <Button
                variant={isActive("home") ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                data-testid="link-home"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
            </Link>
            <Link href="/admin/orders">
              <Button
                variant={isActive("orders") ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                data-testid="link-orders"
              >
                <Package className="w-4 h-4" />
                Orders
              </Button>
            </Link>
            {hasFullAccess && (
              <Link href="/admin/products">
                <Button
                  variant={isActive("products") ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                  data-testid="link-products"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Products
                </Button>
              </Link>
            )}

            {hasFullAccess && (
              <Link href="/admin/cms">
                <Button
                  variant={isCms ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                  data-testid="link-cms"
                >
                  <LayoutGrid className="w-4 h-4" />
                  CMS
                </Button>
              </Link>
            )}

            {hasFullAccess && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isClientManagement ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    data-testid="dropdown-client-management"
                  >
                    <Users className="w-4 h-4" />
                    Client Management
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/admin/customers" className="flex items-center gap-2 cursor-pointer">
                      <Users className="w-4 h-4" />
                      Customers
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/affiliates" className="flex items-center gap-2 cursor-pointer">
                      <Link2 className="w-4 h-4" />
                      Affiliates
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/affiliate-invite-sender" className="flex items-center gap-2 cursor-pointer" data-testid="link-invite-affiliates">
                      <UserPlus className="w-4 h-4" />
                      Invite Affiliates
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/support" className="flex items-center gap-2 cursor-pointer" data-testid="link-support">
                      <Headset className="w-4 h-4" />
                      Support Tickets
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {hasFullAccess && (
              <Link href="/admin/revenue">
                <Button
                  variant={isActive("insights") ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                  data-testid="link-insights"
                >
                  <BarChart3 className="w-4 h-4" />
                  Insights
                </Button>
              </Link>
            )}

            {hasFullAccess && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isSettings ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                    data-testid="dropdown-settings"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/admin/settings" className="flex items-center gap-2 cursor-pointer">
                      <Building2 className="w-4 h-4" />
                      Company Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/team" className="flex items-center gap-2 cursor-pointer">
                      <UserPlus className="w-4 h-4" />
                      Team
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/email-templates" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="w-4 h-4" />
                      Email Templates
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/integrations" className="flex items-center gap-2 cursor-pointer">
                      <Key className="w-4 h-4" />
                      Integrations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/docs" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="w-4 h-4" />
                      Docs Library
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/docs-coverage" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="w-4 h-4" />
                      Docs Coverage
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {role === "fulfillment" && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              Fulfillment
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0"
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
