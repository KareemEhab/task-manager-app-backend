const logger = require("../services/logging");

module.exports = function (err, req, res, next) {
  // Log the full error details
  logger.error("Error occurred:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
  });

  // Send detailed error response
  const statusCode = err.statusCode || err.status || 500;
  const errorResponse = {
    error: true,
    message: err.message || "Something failed",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      details: err,
    }),
  };

  res.status(statusCode).json(errorResponse);
};
