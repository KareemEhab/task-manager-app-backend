const winston = require("winston");
const { MongoDB } = require("winston-mongodb");

// Check if we're in a serverless environment
const isServerless =
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY ||
  process.env.NETLIFY_DEV ||
  process.env._HANDLER;

const transports = [
  // File transport for storing error logs (skip in serverless)
  ...(isServerless
    ? []
    : [
        new winston.transports.File({ filename: "error.log", level: "error" }),
        new winston.transports.File({ filename: "combined.log" }),
      ]),
];

// Only add MongoDB transport if DB connection string is available and not in serverless
// MongoDB transport can cause issues in serverless environments
if (process.env.DB && !isServerless) {
  try {
    transports.push(
      new MongoDB({
        db: process.env.DB,
        options: {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        },
        collection: "logs",
        // Don't fail if MongoDB is unavailable
        silent: true,
      })
    );
  } catch (err) {
    // If MongoDB transport fails to initialize, continue without it
    console.warn("MongoDB logging transport not available:", err.message);
  }
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: transports,
  // Exception handler for handling uncaught exceptions
  exceptionHandlers: [
    ...(isServerless
      ? []
      : [new winston.transports.File({ filename: "exceptions.log" })]),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
  // Rejection handler for handling unhandled promise rejections
  rejectionHandlers: [
    ...(isServerless
      ? []
      : [new winston.transports.File({ filename: "rejections.log" })]),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

// Always log to console in development or serverless environments
if (process.env.NODE_ENV === "development" || isServerless) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

module.exports = logger;
