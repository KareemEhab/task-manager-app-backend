const mongoose = require("mongoose");
const logger = require("../services/logging");

module.exports = function () {
  mongoose
    .connect(process.env.DB, {
      dbName: process.env.DB_NAME,
    })
    .then(() => logger.info("Connected to MongoDB..."))
    .catch((err) => {
      logger.error("MongoDB connection error:", err);
      console.error("MongoDB connection error:", err.message);
      console.error("\nTroubleshooting tips:");
      console.error("1. Check if your MongoDB Atlas IP whitelist allows all IPs (0.0.0.0/0)");
      console.error("2. Verify your DB connection string in environment variables");
      console.error("3. Ensure your MongoDB Atlas cluster is running");
      process.exit(1);
    });
};
