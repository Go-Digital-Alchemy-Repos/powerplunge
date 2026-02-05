import type { Request, Response, NextFunction } from "express";
import { customersService } from "../../services/customers.service";
import { insertCustomerSchema } from "@shared/schema";

export async function listCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const customers = await customersService.getAllCustomersWithStats();
    res.json(customers);
  } catch (error) {
    next(error);
  }
}

export async function getCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await customersService.getCustomerWithOrders(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const customerData = insertCustomerSchema.parse(req.body);
    const customer = await customersService.createCustomer(customerData);
    res.json(customer);
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    await customersService.deleteCustomer(req.params.id);
    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (error) {
    next(error);
  }
}
