import { productsRepository } from "../db/repositories/products.repo";
import { NotFoundError } from "../errors";
import type { InsertProduct, Product } from "@shared/schema";

class ProductsService {
  async getAllProducts() {
    return productsRepository.findAll();
  }

  async getActiveProducts() {
    return productsRepository.findActive();
  }

  async getProductById(id: string) {
    const product = await productsRepository.findById(id);
    if (!product) {
      throw new NotFoundError("Product");
    }
    return product;
  }

  async createProduct(data: InsertProduct) {
    return productsRepository.create(data);
  }

  async updateProduct(id: string, data: Partial<Product>) {
    const product = await productsRepository.update(id, data);
    if (!product) {
      throw new NotFoundError("Product");
    }
    return product;
  }

  async deleteProduct(id: string) {
    await productsRepository.delete(id);
  }
}

export const productsService = new ProductsService();
