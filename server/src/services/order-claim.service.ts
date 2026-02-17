import { db } from "../../db";
import { orders, customers } from "@shared/schema";
import { eq, and, ne, inArray, isNull } from "drizzle-orm";
import { normalizeEmail } from "./customer-identity.service";

export interface ClaimResult {
  claimed: number;
  orderIds: string[];
}

export async function claimOrdersByEmail(
  activeCustomerId: string,
  rawEmail: string,
  source: string
): Promise<ClaimResult> {
  const email = normalizeEmail(rawEmail);

  const otherCustomerIds = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        eq(customers.email, email),
        ne(customers.id, activeCustomerId)
      )
    );

  const donorIds = otherCustomerIds.map((c) => c.id);
  if (donorIds.length === 0) {
    return { claimed: 0, orderIds: [] };
  }

  const result = await db.transaction(async (tx) => {
    const orphanedOrders = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(inArray(orders.customerId, donorIds));

    if (orphanedOrders.length === 0) {
      return { claimed: 0, orderIds: [] as string[] };
    }

    const orderIds = orphanedOrders.map((o) => o.id);

    await tx
      .update(orders)
      .set({ customerId: activeCustomerId })
      .where(inArray(orders.id, orderIds));

    await tx
      .update(customers)
      .set({ mergedIntoCustomerId: activeCustomerId })
      .where(
        and(
          inArray(customers.id, donorIds),
          isNull(customers.mergedIntoCustomerId)
        )
      );

    return { claimed: orderIds.length, orderIds };
  });

  if (result.claimed > 0) {
    console.log(
      `[ORDER-CLAIM] source=${source} email=${email} activeCustomerId=${activeCustomerId} ` +
      `claimedOrders=${result.claimed} orderIds=${result.orderIds.join(",")} donorIds=${donorIds.join(",")}`
    );
  }

  return result;
}
