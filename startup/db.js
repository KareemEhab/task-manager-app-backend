// Mongoose is already configured in startup/mongoose.js
const mongoose = require("./mongoose");
const logger = require("../services/logging");

let isConnecting = false;
let connectionPromise = null;

// Function to ensure database connection
async function ensureConnection() {
  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // If currently connecting, wait for that connection
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  // Start new connection
  isConnecting = true;
  connectionPromise = connect();
  return connectionPromise;
}

async function connect() {
  // Validate connection string format
  const connectionString = process.env.DB;
  if (!connectionString) {
    const error = new Error(
      "MongoDB connection string (DB) is not set in environment variables"
    );
    logger.error(error.message);
    console.error("Error: DB environment variable is not set");
    isConnecting = false;
    // Only exit if not in serverless environment
    if (!process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.NETLIFY) {
      process.exit(1);
    }
    throw error;
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
    // Increased timeout for serverless environments
    serverSelectionTimeoutMS: 30000, // Increased from 5000 to 30000
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000, // Added connection timeout
    maxPoolSize: 10, // Maintain up to 10 socket connections
    minPoolSize: 2, // Maintain at least 2 socket connections
    // Note: bufferMaxEntries and bufferCommands are Mongoose-specific options
    // that should be set via mongoose.set(), not in connection options
  };

  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      logger.info("Already connected to MongoDB");
      isConnecting = false;
      return;
    }

    await mongoose.connect(connectionString, connectionOptions);
    logger.info("Connected to MongoDB...");
    isConnecting = false;
  } catch (err) {
    isConnecting = false;
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
    console.error("4. Check that your connection string is properly formatted");
    // Only exit if not in serverless environment
    if (!process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.NETLIFY) {
      process.exit(1);
    }
    throw err;
  }
}

module.exports = function () {
  // Initialize connection
  connect().catch((err) => {
    // Error already logged in connect function
  });
};

// Export ensureConnection for use in middleware
module.exports.ensureConnection = ensureConnection;
