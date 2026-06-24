export const BETTER_AUTH_ROLES = [
  "customer",
  "super_admin",
  "admin",
  "store_manager",
  "fulfillment",
] as const;

export type BetterAuthRole = (typeof BETTER_AUTH_ROLES)[number];

export const BETTER_AUTH_ADMIN_ROLES = [
  "super_admin",
  "admin",
  "store_manager",
  "fulfillment",
] as const satisfies readonly BetterAuthRole[];

export const BETTER_AUTH_FULL_ACCESS_ROLES = [
  "super_admin",
  "admin",
  "store_manager",
] as const satisfies readonly BetterAuthRole[];

export const BETTER_AUTH_ORDER_ACCESS_ROLES = [
  "super_admin",
  "admin",
  "store_manager",
  "fulfillment",
] as const satisfies readonly BetterAuthRole[];

const ROLE_SET = new Set<string>(BETTER_AUTH_ROLES);

export function normalizeBetterAuthRole(role: string | null | undefined): BetterAuthRole {
  if (role === "superadmin") return "super_admin";
  if (role && ROLE_SET.has(role)) return role as BetterAuthRole;
  return "customer";
}

export function isBetterAuthAdminRole(role: string | null | undefined): boolean {
  return (BETTER_AUTH_ADMIN_ROLES as readonly string[]).includes(normalizeBetterAuthRole(role));
}

export function isBetterAuthFullAccessRole(role: string | null | undefined): boolean {
  return (BETTER_AUTH_FULL_ACCESS_ROLES as readonly string[]).includes(normalizeBetterAuthRole(role));
}
