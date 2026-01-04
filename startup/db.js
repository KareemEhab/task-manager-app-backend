const mongoose = require("mongoose");
const logger = require("../services/logging");

module.exports = function () {
  // Validate connection string format
  const connectionString = process.env.DB;
  if (!connectionString) {
    logger.error(
      "MongoDB connection string (DB) is not set in environment variables"
    );
    console.error("Error: DB environment variable is not set");
    process.exit(1);
  }

  // Check if connection string uses the correct format for Atlas
  if (
    connectionString.startsWith("mongodb://") &&
    connectionString.includes("mongodb.net")
  ) {
    logger.warn(
      "Consider using 'mongodb+srv://' format for MongoDB Atlas clusters"
    );
  }

  const connectionOptions = {
    dbName: process.env.DB_NAME,
    // Modern connection options (Mongoose 8+)
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  mongoose
    .connect(connectionString, connectionOptions)
    .then(() => logger.info("Connected to MongoDB..."))
    .catch((err) => {
      logger.error("MongoDB connection error:", err);
      console.error("MongoDB connection error:", err.message);
      console.error("\nTroubleshooting tips:");
      console.error(
        "1. Check if your MongoDB Atlas IP whitelist allows all IPs (0.0.0.0/0)"
      );
      console.error(
        "2. Verify your DB connection string uses 'mongodb+srv://' format for Atlas"
      );
      console.error("3. Ensure your MongoDB Atlas cluster is running");
      console.error(
        "4. Check that your connection string is properly formatted"
      );
      process.exit(1);
    });
};
