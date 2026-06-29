import type { Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { storage } from "../../storage";
import type { Customer } from "@shared/schema";
import { betterAuthAccount, betterAuthUser, betterAuthVerification } from "@shared/models/better-auth";
import { auth } from "./betterAuth";
import { applyBetterAuthHeaders } from "./adminBetterAuth";

export const BETTER_AUTH_CUSTOMER_PASSWORD_PLACEHOLDER = "better-auth-managed";
export { applyBetterAuthHeaders };

interface BetterAuthEndpointResult<T> {
  response: T;
  headers: Headers;
}

type CustomerBetterAuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
type SerializedCustomer = ReturnType<typeof serializeCustomer>;

export interface CustomerSession {
  customerId: string;
  email: string;
}

export interface CustomerAuthContext {
  betterAuthSession: CustomerBetterAuthSession;
  customer: Customer;
}

export interface CustomerRequestAuth {
  customerId: string;
  email: string;
  customer: SerializedCustomer;
  betterAuthSession?: CustomerBetterAuthSession;
}

declare module "express-serve-static-core" {
  interface Request {
    customerAuth?: CustomerRequestAuth;
    customerSession?: CustomerSession;
  }
}

export function assertCustomerBetterAuthReady() {
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("Better Auth is not configured for customer authentication");
  }
}

export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isAdminLinkedUser(user: { adminUserId?: string | null } | undefined | null): boolean {
  return !!user?.adminUserId;
}

function rejectAdminLinkedCustomerAuth() {
  throw Object.assign(new Error("This email is managed by an admin account. Please use a different customer email."), {
    statusCode: 400,
  });
}

export function serializeCustomer(customer: Customer) {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zipCode: customer.zipCode,
    country: customer.country,
    avatarUrl: customer.avatarUrl || null,
  };
}

function handleDisabledOrMerged(customer: Customer) {
  if (customer.isDisabled) {
    throw Object.assign(new Error("This account has been disabled"), { statusCode: 403 });
  }
  if (customer.mergedIntoCustomerId) {
    throw Object.assign(new Error("This account has been merged. Please use your primary account."), {
      statusCode: 409,
      mergedInto: customer.mergedIntoCustomerId,
    });
  }
}

async function updateBetterAuthCustomerUser(betterAuthUserId: string, customer: Customer) {
  const [existingUser] = await db
    .select()
    .from(betterAuthUser)
    .where(eq(betterAuthUser.id, betterAuthUserId))
    .limit(1);

  const [updatedUser] = await db
    .update(betterAuthUser)
    .set({
      email: normalizeCustomerEmail(customer.email),
      name: customer.name,
      image: customer.avatarUrl || null,
      emailVerified: true,
      role: "customer",
      customerId: customer.id,
      updatedAt: new Date(),
    })
    .where(eq(betterAuthUser.id, betterAuthUserId))
    .returning();
  return updatedUser;
}

export async function getBetterAuthUserByCustomerId(customerId: string) {
  const [user] = await db
    .select()
    .from(betterAuthUser)
    .where(eq(betterAuthUser.customerId, customerId))
    .limit(1);
  return user;
}

export async function getBetterAuthUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(betterAuthUser)
    .where(eq(betterAuthUser.email, normalizeCustomerEmail(email)))
    .limit(1);
  return user;
}

export async function isBetterAuthEmailReservedForAdmin(email: string) {
  const user = await getBetterAuthUserByEmail(email);
  return isAdminLinkedUser(user);
}

async function setBetterAuthCustomerPassword(betterAuthUserId: string, password: string) {
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

export async function syncBetterAuthCustomerUser(customer: Customer, password?: string) {
  assertCustomerBetterAuthReady();

  const linkedUser = await getBetterAuthUserByCustomerId(customer.id);
  const emailUser = await getBetterAuthUserByEmail(customer.email);

  if (isAdminLinkedUser(linkedUser) || isAdminLinkedUser(emailUser)) {
    rejectAdminLinkedCustomerAuth();
  }

  if (emailUser && emailUser.customerId && emailUser.customerId !== customer.id) {
    throw new Error("A Better Auth user with this email already exists");
  }

  let user = linkedUser || emailUser;

  if (!user) {
    const [createdUser] = await db
      .insert(betterAuthUser)
      .values({
        id: crypto.randomUUID(),
        email: normalizeCustomerEmail(customer.email),
        name: customer.name,
        emailVerified: true,
        image: customer.avatarUrl || null,
        role: "customer",
        customerId: customer.id,
        createdAt: customer.createdAt || new Date(),
        updatedAt: new Date(),
      })
      .returning();
    user = createdUser;
  }

  const updatedUser = await updateBetterAuthCustomerUser(user.id, customer);
  if (password) {
    await setBetterAuthCustomerPassword(updatedUser.id, password);
  }
  return updatedUser;
}

export async function ensureCustomerForBetterAuthUser(user: {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  customerId?: string | null;
  adminUserId?: string | null;
}) {
  if (isAdminLinkedUser(user)) {
    rejectAdminLinkedCustomerAuth();
  }

  const linkedCustomer = user.customerId ? await storage.getCustomer(user.customerId) : undefined;
  if (linkedCustomer) {
    handleDisabledOrMerged(linkedCustomer);
    return linkedCustomer;
  }

  let customer = await storage.getCustomerByEmail(user.email);
  if (!customer) {
    customer = await storage.createCustomer({
      email: normalizeCustomerEmail(user.email),
      name: user.name || user.email.split("@")[0],
      avatarUrl: user.image || null,
    });
  }

  handleDisabledOrMerged(customer);
  await updateBetterAuthCustomerUser(user.id, customer);
  return customer;
}

export async function getCustomerAuthContext(req: Request): Promise<CustomerAuthContext | null> {
  assertCustomerBetterAuthReady();

  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) return null;

  const customer = await ensureCustomerForBetterAuthUser(session.user as any);
  return { betterAuthSession: session, customer };
}

export function attachCustomerRequestAuth(
  req: Request,
  customer: SerializedCustomer,
  options: { betterAuthSession?: CustomerBetterAuthSession } = {},
) {
  const requestAuth: CustomerRequestAuth = {
    customerId: customer.id,
    email: customer.email,
    customer,
    betterAuthSession: options.betterAuthSession,
  };

  req.customerAuth = requestAuth;
  req.customerSession = {
    customerId: requestAuth.customerId,
    email: requestAuth.email,
  };
  if (options.betterAuthSession) {
    req.betterAuthSession = options.betterAuthSession;
  }
}

export function attachCustomerAuthContext(req: Request, context: CustomerAuthContext) {
  attachCustomerRequestAuth(req, serializeCustomer(context.customer), {
    betterAuthSession: context.betterAuthSession,
  });
}

export async function getAttachedCustomerAuthContext(req: Request): Promise<CustomerAuthContext | null> {
  const context = await getCustomerAuthContext(req);
  if (!context) return null;
  attachCustomerAuthContext(req, context);
  return context;
}

export async function signUpCustomerAndCreateSession(input: {
  email: string;
  password: string;
  name: string;
}) {
  assertCustomerBetterAuthReady();

  return (await auth.api.signUpEmail({
    body: {
      email: normalizeCustomerEmail(input.email),
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

export async function signInCustomerWithPassword(input: {
  email: string;
  password: string;
}) {
  assertCustomerBetterAuthReady();

  return (await auth.api.signInEmail({
    body: {
      email: normalizeCustomerEmail(input.email),
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

export async function signOutCustomer(req: Request) {
  assertCustomerBetterAuthReady();

  return (await auth.api.signOut({
    headers: fromNodeHeaders(req.headers),
    returnHeaders: true,
  })) as BetterAuthEndpointResult<{ success: boolean }>;
}

export async function changeCustomerPassword(req: Request, input: {
  currentPassword: string;
  newPassword: string;
}) {
  assertCustomerBetterAuthReady();

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

export async function requestCustomerPasswordReset(email: string) {
  assertCustomerBetterAuthReady();

  return auth.api.requestPasswordReset({
    body: {
      email: normalizeCustomerEmail(email),
      redirectTo: "/reset-password",
    },
  });
}

export async function resetCustomerPasswordAndCreateSession(res: Response, input: {
  token: string;
  newPassword: string;
}) {
  assertCustomerBetterAuthReady();

  const [verification] = await db
    .select()
    .from(betterAuthVerification)
    .where(eq(betterAuthVerification.identifier, `reset-password:${input.token}`))
    .limit(1);

  const [user] = verification
    ? await db
        .select()
        .from(betterAuthUser)
        .where(eq(betterAuthUser.id, verification.value))
        .limit(1)
    : [];

  if (!user) {
    throw Object.assign(new Error("Invalid or expired reset link"), { statusCode: 400 });
  }
  if (isAdminLinkedUser(user)) {
    throw Object.assign(new Error("Invalid or expired reset link"), { statusCode: 400 });
  }

  await auth.api.resetPassword({
    body: {
      token: input.token,
      newPassword: input.newPassword,
    },
  });

  const customer = await ensureCustomerForBetterAuthUser(user);
  await storage.updateCustomer(customer.id, {
    passwordHash: BETTER_AUTH_CUSTOMER_PASSWORD_PLACEHOLDER,
  });

  const signIn = await signInCustomerWithPassword({
    email: user.email,
    password: input.newPassword,
  });
  applyBetterAuthHeaders(res, signIn.headers);

  return {
    customer,
    signIn,
  };
}

export async function requestCustomerMagicLink(req: Request, email: string, callbackURL = "/my-account") {
  assertCustomerBetterAuthReady();

  const customer = await storage.getCustomerByEmail(email);
  if (!customer || customer.isDisabled || customer.mergedIntoCustomerId) {
    return { status: true };
  }
  if (await isBetterAuthEmailReservedForAdmin(customer.email)) {
    return { status: true };
  }

  await syncBetterAuthCustomerUser(customer);

  return auth.api.signInMagicLink({
    headers: fromNodeHeaders(req.headers),
    body: {
      email: normalizeCustomerEmail(email),
      callbackURL,
      errorCallbackURL: "/track-order",
    },
  });
}

export async function verifyCustomerMagicLink(req: Request, res: Response, token: string, _callbackURL = "/my-account") {
  assertCustomerBetterAuthReady();

  const result = (await auth.api.magicLinkVerify({
    headers: fromNodeHeaders(req.headers),
    query: {
      token,
    },
    returnHeaders: true,
  })) as BetterAuthEndpointResult<{
    token: string;
    user: { id: string; email: string; name: string; image?: string | null; customerId?: string | null };
  }>;

  const customer = await ensureCustomerForBetterAuthUser(result.response.user);
  applyBetterAuthHeaders(res, result.headers);
  return customer;
}
