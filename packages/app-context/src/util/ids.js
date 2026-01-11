import crypto from "node:crypto";

export function createRequestId() {
  return `req_${crypto.randomBytes(8).toString("hex")}`;
}
