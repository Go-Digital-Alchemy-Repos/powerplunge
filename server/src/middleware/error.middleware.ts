import type { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "../errors/AppError";

interface StandardErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, string[]>;
  };
}

function getErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400: return "BAD_REQUEST";
    case 401: return "UNAUTHORIZED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 422: return "VALIDATION_ERROR";
    case 429: return "RATE_LIMITED";
    case 500: return "INTERNAL_ERROR";
    default: return "ERROR";
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.requestId || "unknown";
  
  if (err instanceof AppError) {
    const response: StandardErrorResponse = {
      error: {
        code: getErrorCode(err.statusCode),
        message: err.message,
        requestId,
      },
    };
    
    if (err instanceof ValidationError && err.errors) {
      response.error.details = err.errors;
    }
    
    res.status(err.statusCode).json(response);
    return;
  }

  console.error(`[ERROR] Unhandled error [${requestId}]:`, err.message);
  
  const response: StandardErrorResponse = {
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      requestId,
    },
  };
  
  res.status(500).json(response);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
