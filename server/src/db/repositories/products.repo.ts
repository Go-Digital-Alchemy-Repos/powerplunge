import { storage } from "../../../storage";
import type { Product, InsertProduct } from "@shared/schema";

class ProductsRepository {
  async findAll(): Promise<Product[]> {
    return storage.getProducts();
  }

  async findActive(): Promise<Product[]> {
    return storage.getActiveProducts();
  }

  async findById(id: string): Promise<Product | undefined> {
    return storage.getProduct(id);
  }

  async findBySlug(slug: string): Promise<Product | undefined> {
    return storage.getProductBySlug(slug);
  }

  async create(data: InsertProduct): Promise<Product> {
    return storage.createProduct(data);
  }

  async update(id: string, data: Partial<Product>): Promise<Product | undefined> {
    return storage.updateProduct(id, data);
  }

  async delete(id: string): Promise<void> {
    await storage.deleteProduct(id);
  }
}

export const productsRepository = new ProductsRepository();
