import type { Request, Response, NextFunction } from "express";
import { productsService } from "../../services/products.service";

export async function listActiveProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const products = await productsService.getActiveProducts();
    res.json(products);
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productsService.getProductById(req.params.id);
    res.json(product);
  } catch (error) {
    next(error);
  }
}
