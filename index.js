require("dotenv").config();

// Configure Mongoose BEFORE any models are loaded
// This is critical for serverless environments
require("./startup/mongoose");
const mongoose = require("mongoose");

const express = require("express");
const app = express();
const cors = require("cors");
require("express-async-errors");
const logger = require("./services/logging");

// Enable JSON parsing (must be before CORS)
app.use(express.json());

// Logging middleware for debugging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - Origin: ${req.headers.origin || "none"}`);
  next();
});

// Handle CORS headers manually for better control
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow all origins
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-auth-token"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// CORS middleware - allow all origins
app.use(
  cors({
    origin: true, // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
    credentials: true,
  })
);

// Handle preflight requests
app.options("*", cors());

// Database connection setup
const dbSetup = require("./startup/db");
dbSetup();

// Middleware to ensure database connection before processing requests
// This is especially important in serverless environments
app.use(async (req, res, next) => {
  // Skip database check for OPTIONS requests
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    // Check if connected
    if (mongoose.connection.readyState === 1) {
      return next();
    }

    // If connecting (readyState === 2), wait for connection with timeout
    if (mongoose.connection.readyState === 2) {
      const startTime = Date.now();
      const timeout = 25000; // 25 seconds timeout
      
      while (mongoose.connection.readyState === 2 && (Date.now() - startTime) < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      
      if (mongoose.connection.readyState === 1) {
        return next();
      }
    }

    // Ensure connection is established
    await dbSetup.ensureConnection();
    
    // Verify connection is ready by checking readyState
    let attempts = 0;
    while (mongoose.connection.readyState !== 1 && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (mongoose.connection.readyState !== 1) {
      throw new Error("Database connection could not be established");
    }
    
    next();
  } catch (err) {
    logger.error("Database connection failed in middleware:", err);
    return res.status(503).json({
      error: true,
      message: "Database connection unavailable. Please try again.",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Routes and other setup
require("./startup/routes")(app);
require("./startup/config")();
require("./startup/validation")();
require("./startup/prod")(app);

// Export app for serverless functions (Netlify)
module.exports = app;

// Only start server if running locally (not in serverless environment)
if (require.main === module) {
  const port = process.env.PORT || 3000;
  // Listen on all network interfaces (0.0.0.0) to allow connections from devices/emulators
  app.listen(port, "0.0.0.0", () => {
    logger.info(`Listening on port ${port}`);
    logger.info(`Server accessible at http://localhost:${port}`);
    logger.info(`For device/emulator access, use your machine's IP address`);
  });
}
