const crypto = require("node:crypto");

function createRequestId() {
  return `req_${crypto.randomBytes(8).toString("hex")}`;
}

module.exports = { createRequestId };
