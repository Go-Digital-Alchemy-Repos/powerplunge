import { customersRepository, type CustomerWithStats, type CustomerWithOrders } from "../db/repositories/customers.repo";
import { NotFoundError, BadRequestError, ConflictError } from "../errors";
import type { InsertCustomer } from "@shared/schema";
import { db } from "../../db";
import { customers, supportTickets, customerMagicLinkTokens, customerNotes, affiliates, couponRedemptions, upsellEvents, abandonedCarts, failedPayments, notifications, orders, orderItems, affiliateReferrals, refunds, shipments, emailEvents, inventoryLedger, postPurchaseOffers, vipActivityLog, recoveryEvents, customerTags, vipCustomers, metaCapiEvents } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

class CustomersService {
  async getAllCustomersWithStats(): Promise<CustomerWithStats[]> {
    const customers = await customersRepository.findAll();
    
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orders = await customersRepository.getOrdersByCustomerId(customer.id);
        const totalSpent = orders
          .filter(o => !!o.stripePaymentIntentId)
          .reduce((sum, o) => sum + o.totalAmount, 0);
        return {
          ...customer,
          orderCount: orders.length,
          totalSpent,
        };
      })
    );

    return customersWithStats;
  }

  async getCustomerWithOrders(customerId: string): Promise<CustomerWithOrders> {
    const customer = await customersRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundError("Customer");
    }

    const orders = await customersRepository.getOrdersByCustomerId(customer.id);
    
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await customersRepository.getOrderItems(order.id);
        return { ...order, items };
      })
    );

    return { customer, orders: ordersWithItems };
  }

  async createCustomer(data: InsertCustomer) {
    const existingCustomer = await customersRepository.findByEmail(data.email);
    if (existingCustomer) {
      throw new ConflictError("Customer with this email already exists");
    }

    return customersRepository.create(data);
  }

  async deleteCustomer(customerId: string): Promise<void> {
    const customer = await customersRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundError("Customer");
    }

    const customerOrders = await customersRepository.getOrdersByCustomerId(customerId);
    const orderIds = customerOrders.map(o => o.id);

    await db.transaction(async (tx) => {
      if (orderIds.length > 0) {
        await tx.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
        const relatedRefunds = await tx
          .select({ id: refunds.id })
          .from(refunds)
          .where(inArray(refunds.orderId, orderIds));
        const refundIds = relatedRefunds.map((r) => r.id);

        await tx.delete(metaCapiEvents).where(inArray(metaCapiEvents.orderId, orderIds));
        if (refundIds.length > 0) {
          await tx.delete(metaCapiEvents).where(inArray(metaCapiEvents.refundId, refundIds));
        }
        await tx.delete(refunds).where(inArray(refunds.orderId, orderIds));
        await tx.delete(affiliateReferrals).where(inArray(affiliateReferrals.orderId, orderIds));
        await tx.delete(shipments).where(inArray(shipments.orderId, orderIds));
        await tx.delete(emailEvents).where(inArray(emailEvents.orderId, orderIds));
        await tx.delete(inventoryLedger).where(inArray(inventoryLedger.orderId, orderIds));
        await tx.delete(postPurchaseOffers).where(inArray(postPurchaseOffers.orderId, orderIds));
        await tx.delete(recoveryEvents).where(inArray(recoveryEvents.orderId, orderIds));
        await tx.delete(supportTickets).where(inArray(supportTickets.orderId, orderIds));
        await tx.delete(vipActivityLog).where(inArray(vipActivityLog.orderId, orderIds));
        await tx.delete(abandonedCarts).where(inArray(abandonedCarts.recoveredOrderId, orderIds));
        await tx.delete(failedPayments).where(inArray(failedPayments.orderId, orderIds));
        await tx.delete(couponRedemptions).where(inArray(couponRedemptions.orderId, orderIds));
        await tx.delete(upsellEvents).where(inArray(upsellEvents.orderId, orderIds));
        await tx.delete(orders).where(eq(orders.customerId, customerId));
      }
      await tx.delete(supportTickets).where(eq(supportTickets.customerId, customerId));
      await tx.delete(customerMagicLinkTokens).where(eq(customerMagicLinkTokens.customerId, customerId));
      await tx.delete(customerNotes).where(eq(customerNotes.customerId, customerId));
      await tx.delete(customerTags).where(eq(customerTags.customerId, customerId));
      await tx.delete(vipCustomers).where(eq(vipCustomers.customerId, customerId));
      await tx.delete(vipActivityLog).where(eq(vipActivityLog.customerId, customerId));
      await tx.delete(couponRedemptions).where(eq(couponRedemptions.customerId, customerId));
      await tx.delete(upsellEvents).where(eq(upsellEvents.customerId, customerId));
      await tx.delete(abandonedCarts).where(eq(abandonedCarts.customerId, customerId));
      await tx.delete(failedPayments).where(eq(failedPayments.customerId, customerId));
      await tx.delete(notifications).where(
        and(eq(notifications.recipientType, "customer"), eq(notifications.recipientId, customerId))
      );
      await tx.delete(affiliates).where(eq(affiliates.customerId, customerId));
      await tx.delete(customers).where(eq(customers.id, customerId));
    });
  }
}

export const customersService = new CustomersService();
