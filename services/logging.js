const winston = require("winston");
const { MongoDB } = require("winston-mongodb");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [
    // MongoDB transport for storing logs in the database
    new MongoDB({
      db: process.env.DB, // Your MongoDB connection string
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
      collection: "logs", // Collection name where logs will be stored
    }),
    // File transport for storing error logs
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
  // Exception handler for handling uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: "exceptions.log" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
  // Rejection handler for handling unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: "rejections.log" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

// If the environment is development, log to console
if (process.env.NODE_ENV === "development") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

module.exports = logger;
