import { productsRepository } from "../db/repositories/products.repo";
import { NotFoundError } from "../errors";
import type { InsertProduct, Product } from "@shared/schema";
import { slugify } from "../utils/slugify";

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

  async getProductBySlug(slug: string) {
    const product = await productsRepository.findBySlug(slug);
    if (!product) {
      throw new NotFoundError("Product");
    }
    return product;
  }

  async createProduct(data: InsertProduct) {
    if (!data.urlSlug && data.name) {
      data.urlSlug = await this.generateUniqueSlug(data.name);
    }
    return productsRepository.create(data);
  }

  async updateProduct(id: string, data: Partial<Product>) {
    if (data.name && !data.urlSlug) {
      const existing = await productsRepository.findById(id);
      if (existing && !existing.urlSlug) {
        data.urlSlug = await this.generateUniqueSlug(data.name);
      }
    }
    const product = await productsRepository.update(id, data);
    if (!product) {
      throw new NotFoundError("Product");
    }
    return product;
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    let baseSlug = slugify(name);
    let slug = baseSlug;
    let counter = 1;
    while (await productsRepository.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  }

  async deleteProduct(id: string) {
    await productsRepository.delete(id);
  }
}

export const productsService = new ProductsService();
