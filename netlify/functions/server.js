// CRITICAL: Load mongoose configuration FIRST, before anything else
// This ensures buffering is disabled before any models are loaded
require("../../startup/mongoose");

const serverless = require("serverless-http");
const dbSetup = require("../../startup/db");

// Initialize database connection
dbSetup();

const app = require("../../index");

// Create serverless handler with connection check
const handler = serverless(app);

// Wrap handler to ensure DB connection before processing
exports.handler = async (event, context) => {
  const mongoose = require("mongoose");

  // Ensure connection before processing request
  if (mongoose.connection.readyState !== 1) {
    try {
      await dbSetup.ensureConnection();
      // Wait a moment to ensure connection is fully ready
      let attempts = 0;
      while (mongoose.connection.readyState !== 1 && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
    } catch (err) {
      console.error("Failed to establish DB connection:", err);
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: true,
          message: "Database connection unavailable. Please try again.",
        }),
      };
    }
  }

  return handler(event, context);
};
