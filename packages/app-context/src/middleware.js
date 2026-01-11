import { createRequestId } from "./util/ids.js";

export function createMiddleware({ writer, redact, excludeRoutes = [] }) {
  const excluded = new Set(excludeRoutes);

  return function appContextMiddleware(req, res, next) {
    try {
      const path = req.path || req.url || "";
      if (excluded.has(path)) return next();

      const requestId = createRequestId();
      const start = process.hrtime.bigint();

      res.on("finish", () => {
        const end = process.hrtime.bigint();
        const latencyMs = Number(end - start) / 1e6;

        writer.write({
          type: "request",
          ts: new Date().toISOString(),
          requestId,
          method: req.method,
          path,
          status: res.statusCode,
          latencyMs: Math.round(latencyMs),
        });
      });

      next();
    } catch (e) {
      // never block app flow
      next();
    }
  };
}
