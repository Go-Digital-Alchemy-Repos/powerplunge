import { storage } from "../../../storage";
import type { Customer, InsertCustomer } from "@shared/schema";

export interface CustomerWithStats extends Customer {
  orderCount: number;
  totalSpent: number;
}

export interface CustomerWithOrders {
  customer: Customer;
  orders: Array<{
    id: string;
    status: string;
    totalAmount: number;
    createdAt: Date;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
    }>;
  }>;
}

class CustomersRepository {
  async findAll(): Promise<Customer[]> {
    return storage.getCustomers();
  }

  async findById(id: string): Promise<Customer | undefined> {
    return storage.getCustomer(id);
  }

  async findByEmail(email: string): Promise<Customer | undefined> {
    return storage.getCustomerByEmail(email);
  }

  async create(data: InsertCustomer): Promise<Customer> {
    return storage.createCustomer(data);
  }

  async delete(id: string): Promise<void> {
    await storage.deleteCustomer(id);
  }

  async getOrdersByCustomerId(customerId: string) {
    return storage.getOrdersByCustomerId(customerId);
  }

  async getOrderItems(orderId: string) {
    return storage.getOrderItems(orderId);
  }

  async getAllOrders() {
    return storage.getOrders();
  }
}

export const customersRepository = new CustomersRepository();
