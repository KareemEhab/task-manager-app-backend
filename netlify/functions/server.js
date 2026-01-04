const serverless = require("serverless-http");
const app = require("../../index");

// Export the serverless handler
exports.handler = serverless(app);

