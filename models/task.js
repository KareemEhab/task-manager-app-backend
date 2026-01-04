const Joi = require("joi");
const mongoose = require("mongoose");

const taskCommentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  comment: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
  },
  description: {
    type: String,
    maxlength: 500,
    default: "",
  },
  priority: {
    type: String,
    required: true,
    enum: ["low", "medium", "high"],
  },
  status: {
    type: String,
    required: true,
    enum: ["upcoming", "in-progress", "in-review", "completed"],
  },
  dueDate: {
    type: Date,
  },
  assignedTo: {
    type: String,
    maxlength: 255,
  },
  categories: {
    type: [String],
    required: true,
    validate: {
      validator: function (v) {
        return v && v.length > 0;
      },
      message: "At least one category is required",
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  comments: {
    type: [taskCommentSchema],
    default: [],
  },
  deleted: {
    type: Boolean,
    default: false,
  },
});

// Pre-save hook to ensure assignedTo email is always lowercase
taskSchema.pre("save", function (next) {
  this.lastUpdated = new Date();
  if (this.assignedTo) {
    this.assignedTo = this.assignedTo.toLowerCase();
  }
  next();
});

const Task = mongoose.model("Task", taskSchema);

const validateTask = (task) => {
  const schema = {
    title: Joi.string().min(3).max(50).required(),
    description: Joi.string().max(500).allow(""),
    priority: Joi.string().valid("low", "medium", "high").required(),
    status: Joi.string()
      .valid("upcoming", "in-progress", "in-review", "completed")
      .required(),
    dueDate: Joi.date().optional(),
    assignedTo: Joi.string().max(255).email().allow("").optional(),
    categories: Joi.array().items(Joi.string()).min(1).required(),
    comments: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        comment: Joi.string().required(),
        createdAt: Joi.date().optional(),
        deleted: Joi.boolean().optional(),
      })
    ),
    deleted: Joi.boolean(),
  };

  return Joi.validate(task, schema);
};

// Validation for partial updates
const validateTaskUpdate = (task) => {
  const schema = {
    title: Joi.string().min(3).max(50).optional(),
    description: Joi.string().max(500).allow("").optional(),
    priority: Joi.string().valid("low", "medium", "high").optional(),
    status: Joi.string()
      .valid("upcoming", "in-progress", "in-review", "completed")
      .optional(),
    dueDate: Joi.date().optional(),
    assignedTo: Joi.string().max(255).email().allow("").optional(),
    categories: Joi.array().items(Joi.string()).min(1).optional(),
    comments: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        comment: Joi.string().required(),
        createdAt: Joi.date().optional(),
        deleted: Joi.boolean().optional(),
      })
    ).optional(),
    deleted: Joi.boolean().optional(),
  };

  return Joi.validate(task, schema);
};

exports.Task = Task;
exports.validate = validateTask;
exports.validateUpdate = validateTaskUpdate;
