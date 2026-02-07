import type { Request, Response, NextFunction } from "express";

const SLOW_THRESHOLD_MS = 200;

const routeTimings: Map<string, { total: number; count: number; max: number }> = new Map();

export function serverTimingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = Math.round(durationNs / 1e6);

    if (process.env.NODE_ENV !== "production") {
      const routeKey = `${req.method} ${req.route?.path || req.path}`;
      const existing = routeTimings.get(routeKey) || { total: 0, count: 0, max: 0 };
      existing.total += durationMs;
      existing.count += 1;
      existing.max = Math.max(existing.max, durationMs);
      routeTimings.set(routeKey, existing);

      if (durationMs >= SLOW_THRESHOLD_MS) {
        console.warn(
          `[SLOW-ENDPOINT] ${req.method} ${req.path} took ${durationMs}ms (threshold: ${SLOW_THRESHOLD_MS}ms)`
        );
      }
    }
  });

  next();
}

export function getTimingReport(): Array<{
  route: string;
  avg: number;
  max: number;
  count: number;
}> {
  const entries = Array.from(routeTimings.entries()).map(([route, stats]) => ({
    route,
    avg: Math.round(stats.total / stats.count),
    max: stats.max,
    count: stats.count,
  }));
  return entries.sort((a, b) => b.avg - a.avg);
}

export function resetTimings(): void {
  routeTimings.clear();
}
