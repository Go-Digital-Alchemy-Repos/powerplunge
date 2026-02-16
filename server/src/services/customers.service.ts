import { customersRepository, type CustomerWithStats, type CustomerWithOrders } from "../db/repositories/customers.repo";
import { NotFoundError, BadRequestError, ConflictError } from "../errors";
import type { InsertCustomer } from "@shared/schema";

class CustomersService {
  async getAllCustomersWithStats(): Promise<CustomerWithStats[]> {
    const customers = await customersRepository.findAll();
    
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orders = await customersRepository.getOrdersByCustomerId(customer.id);
        const totalSpent = orders.reduce((sum, o) => {
          // If it's a manual order and has no Stripe Payment Intent ID, it's FREE
          if (o.isManualOrder && !o.stripePaymentIntentId) {
            return sum;
          }
          return sum + o.totalAmount;
        }, 0);
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

    await customersRepository.delete(customerId);
  }
}

export const customersService = new CustomersService();
