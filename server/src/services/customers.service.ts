import { customersRepository, type CustomerWithStats, type CustomerWithOrders } from "../db/repositories/customers.repo";
import { NotFoundError, BadRequestError, ConflictError } from "../errors";
import type { InsertCustomer } from "@shared/schema";
import { db } from "../../db";
import { customers, supportTickets, customerMagicLinkTokens, customerNotes, affiliates, couponRedemptions, upsellEvents, abandonedCarts, failedPayments, notifications } from "@shared/schema";
import { eq, and } from "drizzle-orm";

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

    const allOrders = await customersRepository.getAllOrders();
    const customerOrders = allOrders.filter(o => o.customerId === customerId);
    
    if (customerOrders.length > 0) {
      throw new BadRequestError(
        "Cannot delete customer with existing orders. Delete orders first or disable the account instead."
      );
    }

    await db.transaction(async (tx) => {
      await tx.delete(supportTickets).where(eq(supportTickets.customerId, customerId));
      await tx.delete(customerMagicLinkTokens).where(eq(customerMagicLinkTokens.customerId, customerId));
      await tx.delete(customerNotes).where(eq(customerNotes.customerId, customerId));
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
