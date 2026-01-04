const Joi = require("joi");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { User } = require("../models/user");
const express = require("express");
const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const { error } = validate(req.body);
    if (error) {
      return res.status(400).json({
        error: true,
        message: error.details[0].message,
        details: error.details,
      });
    }

    // Convert email to lowercase for consistent comparison
    const email = req.body.email.toLowerCase();
    
    let user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({
        error: true,
        message: "Invalid email or password.",
      });
    }

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
      return res.status(400).json({
        error: true,
        message: "Invalid email or password.",
      });
    }

    const token = user.generateAuthToken();
    res.send(token);
  } catch (err) {
    next(err);
  }
});

function validate(req) {
  const schema = Joi.object({
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(5).max(255).required(),
  });

  return schema.validate(req);
}

module.exports = router;
