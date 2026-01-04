require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
require("express-async-errors");
const logger = require("./services/logging");

const allowedOrigins = [
  "https://audiophile-ecommerce-webapp.vercel.app", // Production
  "http://localhost:5173", // Development web
  "http://localhost:8081", // Expo web
  "exp://localhost:8081", // Expo
];

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

  // Allow all origins in development, or check against allowed list
  if (process.env.NODE_ENV === "production") {
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
  } else {
    // In development, allow all origins (for React Native/Expo)
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
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

// CORS middleware - more permissive in development
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" 
      ? allowedOrigins 
      : true, // Allow all origins in development
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
    credentials: true,
  })
);

// Handle preflight requests
app.options("*", cors());

// Routes and other setup
require("./startup/routes")(app);
require("./startup/db")();
require("./startup/config")();
require("./startup/validation")();
require("./startup/prod")(app);

const port = process.env.PORT || 3000;
// Listen on all network interfaces (0.0.0.0) to allow connections from devices/emulators
app.listen(port, "0.0.0.0", () => {
  logger.info(`Listening on port ${port}`);
  logger.info(`Server accessible at http://localhost:${port}`);
  logger.info(`For device/emulator access, use your machine's IP address`);
});
