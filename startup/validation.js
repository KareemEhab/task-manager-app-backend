const Joi = require("joi");

module.exports = function () {
  Joi.objectId = require("joi-objectid")(Joi); //This is used to validate objectIds in validate functions in model files Joi.objectId() just like Joi.string() or Joi.number()
};
