import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminPageProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminPage({ title, subtitle, actions, children }: AdminPageProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-white" data-testid="admin-page-wrapper">
      <div className="flex items-start justify-between px-6 pt-6 pb-4" data-testid="admin-page-header">
        <div>
          <h1 className="text-2xl font-bold" data-testid="admin-page-title">{title}</h1>
          {subtitle && (
            <p className="text-gray-400 text-sm mt-1" data-testid="admin-page-subtitle">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex gap-2" data-testid="admin-page-actions">{actions}</div>
        )}
      </div>
      <div className="px-6 pb-8" data-testid="admin-page-content">{children}</div>
    </div>
  );
}

interface AdminSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function AdminSection({ title, children, className }: AdminSectionProps) {
  return (
    <section className={cn(className)} data-testid="admin-section-wrapper">
      {title && (
        <h2 className="text-lg font-semibold text-white mb-3" data-testid="admin-section-title">{title}</h2>
      )}
      {children}
    </section>
  );
}

interface AdminCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function AdminCard({ title, description, children, className, actions }: AdminCardProps) {
  const hasHeader = title || description || actions;
  return (
    <div
      className={cn("bg-gray-900/50 border border-gray-800/60 rounded-lg p-5", className)}
      data-testid="admin-card-wrapper"
    >
      {hasHeader && (
        <div className="flex items-start justify-between" data-testid="admin-card-header">
          <div>
            {title && (
              <h3 className="text-base font-medium text-white" data-testid="admin-card-title">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-gray-500 mt-0.5" data-testid="admin-card-description">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex gap-2" data-testid="admin-card-actions">{actions}</div>
          )}
        </div>
      )}
      <div className={cn(hasHeader && "mt-4")} data-testid="admin-card-content">{children}</div>
    </div>
  );
}

interface AdminToolbarProps {
  children: ReactNode;
  className?: string;
}

export function AdminToolbar({ children, className }: AdminToolbarProps) {
  return (
    <div className={cn("flex items-center gap-3 mb-4", className)} data-testid="admin-toolbar-wrapper">
      {children}
    </div>
  );
}

interface AdminStatProps {
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
}

export function AdminStat({ label, value, trend }: AdminStatProps) {
  return (
    <div data-testid="admin-stat-wrapper">
      <p className="text-xs text-gray-500 uppercase tracking-wider" data-testid="admin-stat-label">{label}</p>
      <p className="text-2xl font-bold text-white" data-testid="admin-stat-value">{value}</p>
      {trend && (
        <p
          className={cn("text-xs", trend.positive ? "text-green-400" : "text-red-400")}
          data-testid="admin-stat-trend"
        >
          {trend.value}
        </p>
      )}
    </div>
  );
}
