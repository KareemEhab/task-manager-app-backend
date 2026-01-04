module.exports = function () {
  if (!process.env.SECRET_KEY) {
    throw new Error(
      "FATAL ERROR: SECRET_KEY environment variable is not defined."
    );
  }
};
