const mongoose = require("mongoose");
const logger = require("../services/logging");

module.exports = function () {
  mongoose
    .connect(process.env.DB, {
      dbName: process.env.DB_NAME,
    })
    .then(() => logger.info("Connected to MongoDB..."));
};
