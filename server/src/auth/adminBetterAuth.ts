import type { Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { storage } from "../../storage";
import { adminUsers, type AdminUser } from "@shared/schema";
import { betterAuthAccount, betterAuthUser, betterAuthVerification } from "@shared/models/better-auth";
import { normalizeBetterAuthRole, isBetterAuthAdminRole, type BetterAuthRole } from "@shared/auth/roles";
import { auth } from "./betterAuth";

export const BETTER_AUTH_LEGACY_PASSWORD_PLACEHOLDER = "better-auth-managed";

type AdminBetterAuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
type SerializedAdminUser = ReturnType<typeof serializeAdmin>;

export interface AdminAuthContext {
  betterAuthSession: AdminBetterAuthSession;
  admin: AdminUser;
  role: BetterAuthRole;
}

export interface AdminRequestAuth {
  adminId: string;
  adminUser: SerializedAdminUser;
  role: BetterAuthRole;
  betterAuthSession?: AdminBetterAuthSession;
}

interface BetterAuthEndpointResult<T> {
  response: T;
  headers: Headers;
}

declare module "express-serve-static-core" {
  interface Request {
    adminAuth?: AdminRequestAuth;
    adminId?: string;
    adminUser?: SerializedAdminUser;
    betterAuthSession?: AdminBetterAuthSession;
  }
}

export function serializeAdmin(admin: AdminUser) {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    firstName: admin.firstName,
    lastName: admin.lastName,
    phone: admin.phone,
    role: normalizeBetterAuthRole(admin.role),
    avatarUrl: admin.avatarUrl || null,
  };
}

export function assertAdminBetterAuthReady() {
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("Better Auth is not configured for admin authentication");
  }
}

export function applyBetterAuthHeaders(res: Response, headers: Headers) {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = getSetCookie?.call(headers) ?? [];

  for (const cookie of setCookies) {
    res.append("Set-Cookie", cookie);
  }

  if (setCookies.length === 0) {
    const cookie = headers.get("set-cookie");
    if (cookie) res.append("Set-Cookie", cookie);
  }
}

export async function getAdminAuthContext(req: Request): Promise<AdminAuthContext | null> {
  assertAdminBetterAuthReady();

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) return null;

  const adminUserId = (session.user as any).adminUserId;
  if (!adminUserId) return null;

  const admin = await storage.getAdminUser(adminUserId);
  if (!admin) return null;

  const role = normalizeBetterAuthRole(admin.role);
  if (!isBetterAuthAdminRole(role)) return null;

  return {
    betterAuthSession: session,
    admin,
    role,
  };
}

export function attachAdminRequestAuth(
  req: Request,
  admin: SerializedAdminUser,
  options: { betterAuthSession?: AdminBetterAuthSession } = {},
) {
  const requestAuth: AdminRequestAuth = {
    adminId: admin.id,
    adminUser: admin,
    role: admin.role,
    betterAuthSession: options.betterAuthSession,
  };

  req.adminAuth = requestAuth;
  req.adminId = requestAuth.adminId;
  req.adminUser = requestAuth.adminUser;
  if (options.betterAuthSession) {
    req.betterAuthSession = options.betterAuthSession;
  }
}

export function attachAdminAuthContext(req: Request, context: AdminAuthContext) {
  attachAdminRequestAuth(req, serializeAdmin(context.admin), {
    betterAuthSession: context.betterAuthSession,
  });
}

export async function getAttachedAdminAuthContext(req: Request): Promise<AdminAuthContext | null> {
  const context = await getAdminAuthContext(req);
  if (!context) return null;
  attachAdminAuthContext(req, context);
  return context;
}

export async function signUpAdminAndCreateSession(input: {
  email: string;
  password: string;
  name: string;
}) {
  assertAdminBetterAuthReady();

  return (await auth.api.signUpEmail({
    body: {
      email: input.email,
      password: input.password,
      name: input.name,
      rememberMe: true,
    },
    returnHeaders: true,
  })) as BetterAuthEndpointResult<{
    token: string | null;
    user: { id: string; email: string; name: string };
  }>;
}

export async function signInAdminWithPassword(input: {
  email: string;
  password: string;
}) {
  assertAdminBetterAuthReady();

  return (await auth.api.signInEmail({
    body: {
      email: input.email,
      password: input.password,
      rememberMe: true,
    },
    returnHeaders: true,
  })) as BetterAuthEndpointResult<{
    redirect: boolean;
    token: string;
    user: { id: string; email: string; name: string };
  }>;
}

export async function signOutAdmin(req: Request) {
  assertAdminBetterAuthReady();

  return (await auth.api.signOut({
    headers: fromNodeHeaders(req.headers),
    returnHeaders: true,
  })) as BetterAuthEndpointResult<{ success: boolean }>;
}

export async function changeAdminPassword(req: Request, input: {
  currentPassword: string;
  newPassword: string;
}) {
  assertAdminBetterAuthReady();

  return (await auth.api.changePassword({
    headers: fromNodeHeaders(req.headers),
    body: {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      revokeOtherSessions: true,
    },
    returnHeaders: true,
  })) as BetterAuthEndpointResult<{ token: string | null; user: unknown }>;
}

export async function requestAdminPasswordReset(email: string) {
  assertAdminBetterAuthReady();

  return auth.api.requestPasswordReset({
    body: {
      email: email.trim().toLowerCase(),
      redirectTo: "/admin/reset-password",
    },
  });
}

async function getAdminForPasswordResetToken(token: string) {
  const [verification] = await db
    .select()
    .from(betterAuthVerification)
    .where(eq(betterAuthVerification.identifier, `reset-password:${token}`))
    .limit(1);

  if (!verification || verification.expiresAt < new Date()) return null;

  const [user] = await db
    .select()
    .from(betterAuthUser)
    .where(eq(betterAuthUser.id, verification.value))
    .limit(1);

  if (!user?.adminUserId) return null;

  const admin = await storage.getAdminUser(user.adminUserId);
  if (!admin) return null;

  const role = normalizeBetterAuthRole(admin.role);
  if (!isBetterAuthAdminRole(role)) return null;

  return { user, admin };
}

export async function validateAdminPasswordResetToken(token: string) {
  assertAdminBetterAuthReady();
  return !!(await getAdminForPasswordResetToken(token));
}

export async function resetAdminPasswordAndCreateSession(res: Response, input: {
  token: string;
  newPassword: string;
}) {
  assertAdminBetterAuthReady();

  const context = await getAdminForPasswordResetToken(input.token);
  if (!context) {
    throw Object.assign(new Error("Invalid or expired reset link"), { statusCode: 400 });
  }

  await auth.api.resetPassword({
    body: {
      token: input.token,
      newPassword: input.newPassword,
    },
  });

  await storage.updateAdminUser(context.admin.id, {
    password: BETTER_AUTH_LEGACY_PASSWORD_PLACEHOLDER,
  });

  const signIn = await signInAdminWithPassword({
    email: context.user.email,
    password: input.newPassword,
  });
  applyBetterAuthHeaders(res, signIn.headers);

  return {
    admin: context.admin,
    signIn,
  };
}

export async function syncBetterAuthAdminUser(admin: AdminUser, password?: string) {
  assertAdminBetterAuthReady();

  const [existingUser] = await db
    .select()
    .from(betterAuthUser)
    .where(eq(betterAuthUser.adminUserId, admin.id))
    .limit(1);

  const [emailUser] = await db
    .select()
    .from(betterAuthUser)
    .where(eq(betterAuthUser.email, admin.email.toLowerCase()))
    .limit(1);

  if (emailUser && emailUser.adminUserId !== admin.id) {
    throw new Error("A Better Auth user with this email already exists");
  }

  let user = existingUser;

  if (!user) {
    if (!password) {
      throw new Error("Password is required to create a Better Auth admin user");
    }

    const created = await auth.api.signUpEmail({
      body: {
        email: admin.email,
        password,
        name: admin.name,
        rememberMe: false,
      },
    }) as { user: { id: string } };

    const [createdUser] = await db
      .select()
      .from(betterAuthUser)
      .where(eq(betterAuthUser.id, created.user.id))
      .limit(1);
    user = createdUser;
  }

  if (!user) {
    throw new Error("Failed to create Better Auth admin user");
  }

  const updatedUser = await updateBetterAuthAdminUser(user.id, admin);

  if (password) {
    await setBetterAuthPassword(updatedUser.id, password);
  }

  return updatedUser;
}

export async function updateBetterAuthAdminUser(
  betterAuthUserId: string,
  admin: AdminUser,
) {
  const [updatedUser] = await db
    .update(betterAuthUser)
    .set({
      email: admin.email.toLowerCase(),
      name: admin.name,
      image: admin.avatarUrl || null,
      emailVerified: true,
      role: normalizeBetterAuthRole(admin.role),
      adminUserId: admin.id,
      updatedAt: new Date(),
    })
    .where(eq(betterAuthUser.id, betterAuthUserId))
    .returning();
  return updatedUser;
}

export async function setBetterAuthPassword(betterAuthUserId: string, password: string) {
  const passwordHash = await hashPassword(password);
  const [account] = await db
    .select()
    .from(betterAuthAccount)
    .where(
      and(
        eq(betterAuthAccount.userId, betterAuthUserId),
        eq(betterAuthAccount.providerId, "credential"),
      ),
    )
    .limit(1);

  if (account) {
    await db
      .update(betterAuthAccount)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(eq(betterAuthAccount.id, account.id));
    return;
  }

  await db.insert(betterAuthAccount).values({
    id: crypto.randomUUID(),
    accountId: betterAuthUserId,
    providerId: "credential",
    userId: betterAuthUserId,
    password: passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function getBetterAuthUserByAdminId(adminUserId: string) {
  const [user] = await db
    .select()
    .from(betterAuthUser)
    .where(eq(betterAuthUser.adminUserId, adminUserId))
    .limit(1);
  return user;
}

export async function getBetterAuthUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(betterAuthUser)
    .where(eq(betterAuthUser.email, email.toLowerCase()))
    .limit(1);
  return user;
}

export async function deleteBetterAuthAdminUser(adminUserId: string) {
  const user = await getBetterAuthUserByAdminId(adminUserId);
  if (!user) return;
  await db.delete(betterAuthUser).where(eq(betterAuthUser.id, user.id));
}

export async function deleteBetterAuthUserById(betterAuthUserId: string) {
  await db.delete(betterAuthUser).where(eq(betterAuthUser.id, betterAuthUserId));
}
