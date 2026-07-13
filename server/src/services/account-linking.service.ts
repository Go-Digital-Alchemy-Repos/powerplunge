import { db } from "../../db";
import { orders, customers } from "@shared/schema";
import { eq, and, ne, inArray, isNull } from "drizzle-orm";
import { normalizeEmail } from "./customer-identity.service";

export interface OrderLinkResult {
  linkedCount: number;
  orderIds: string[];
}

export async function linkOrdersToCustomerByEmail(
  activeCustomerId: string,
  rawEmail: string,
  source: string
): Promise<OrderLinkResult> {
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
    return { linkedCount: 0, orderIds: [] };
  }

  const result = await db.transaction(async (tx) => {
    const orphanedOrders = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(inArray(orders.customerId, donorIds));

    if (orphanedOrders.length === 0) {
      return { linkedCount: 0, orderIds: [] as string[] };
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

    return { linkedCount: orderIds.length, orderIds };
  });

  if (result.linkedCount > 0) {
    console.log(
      `[ACCOUNT-LINKING] source=${source} email=${email} activeCustomerId=${activeCustomerId} ` +
      `linkedOrders=${result.linkedCount} orderIds=${result.orderIds.join(",")} donorIds=${donorIds.join(",")}`
    );
  }

  return result;
}
