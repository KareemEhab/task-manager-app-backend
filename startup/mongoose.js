// Mongoose configuration - MUST be loaded before any models
const mongoose = require("mongoose");

// Disable mongoose buffering globally - fail fast if not connected
// This prevents the "buffering timed out" error in serverless environments
mongoose.set("bufferCommands", false);

// Note: bufferMaxEntries and bufferTimeoutMS are connection-level options,
// not global mongoose.set() options. They are set in the connection options in startup/db.js

module.exports = mongoose;

