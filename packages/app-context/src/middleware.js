import { createRequestId } from "./util/ids.js";

export function createMiddleware({ writer, redact, excludeRoutes = [] }) {
  const excluded = new Set(excludeRoutes);

  return function appContextMiddleware(req, res, next) {
    try {
      const path = getSafePath(req);
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

function getSafePath(req) {
  const p = typeof req?.path === "string" ? req.path : "";
  if (p) return p;

  const raw =
    (typeof req?.originalUrl === "string" && req.originalUrl) ||
    (typeof req?.url === "string" && req.url) ||
    "";

  // Strip query string / fragments to avoid leaking tokens or PII via URL params.
  const q = raw.indexOf("?");
  const h = raw.indexOf("#");
  const cut = q === -1 ? h : h === -1 ? q : Math.min(q, h);
  return cut === -1 ? raw : raw.slice(0, cut);
}
