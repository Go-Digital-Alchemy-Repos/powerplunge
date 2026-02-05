import type { Request, Response, NextFunction } from "express";
import { productsService } from "../../services/products.service";
import { insertProductSchema } from "@shared/schema";

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const products = await productsService.getAllProducts();
    res.json(products);
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const productData = insertProductSchema.parse(req.body);
    const product = await productsService.createProduct(productData);
    res.json(product);
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productsService.updateProduct(req.params.id, req.body);
    res.json(product);
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await productsService.deleteProduct(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
