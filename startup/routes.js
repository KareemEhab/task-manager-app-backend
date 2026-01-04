const express = require("express");
const users = require("../routes/users");
const auth = require("../routes/auth");
const tasks = require("../routes/tasks");
const error = require("../middleware/error");

module.exports = function (app) {
  // JSON parsing is already handled in index.js before CORS
  app.use("/api/users", users);
  app.use("/api/auth", auth);
  app.use("/api/tasks", tasks);
  app.use(error);
};
