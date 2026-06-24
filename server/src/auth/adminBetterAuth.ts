import type { Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { storage } from "../../storage";
import { adminUsers, type AdminUser } from "@shared/schema";
import { betterAuthAccount, betterAuthUser } from "@shared/models/better-auth";
import { normalizeBetterAuthRole, isBetterAuthAdminRole, type BetterAuthRole } from "@shared/auth/roles";
import { auth } from "./betterAuth";

export const BETTER_AUTH_LEGACY_PASSWORD_PLACEHOLDER = "better-auth-managed";

export interface AdminAuthContext {
  betterAuthSession: Awaited<ReturnType<typeof auth.api.getSession>>;
  admin: AdminUser;
  role: BetterAuthRole;
}

interface BetterAuthEndpointResult<T> {
  response: T;
  headers: Headers;
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

export function attachAdminAuthContext(req: Request, context: AdminAuthContext) {
  const admin = serializeAdmin(context.admin);
  req.betterAuthSession = context.betterAuthSession!;
  req.adminId = admin.id;
  req.adminUser = admin;

  // Temporary compatibility for older admin route modules that still read
  // express-session fields for audit IDs/emails after auth has passed.
  if (req.session) {
    req.session.adminId = admin.id;
    req.session.adminRole = admin.role;
    req.session.adminEmail = admin.email;
    req.session.adminUser = admin;
  }
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
