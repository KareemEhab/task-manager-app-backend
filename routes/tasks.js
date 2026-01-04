const auth = require("../middleware/auth");
const { Router } = require("express");
const router = Router();
const { Task, validate, validateUpdate } = require("../models/task");

// Function to exclude __v field
const excludeVField = { __v: 0 };

// Get all tasks for the authenticated user
// Returns tasks where user is the creator OR assigned to the user by email
// Excludes deleted tasks
router.get("/", auth, async (req, res) => {
  // Convert email to lowercase for consistent comparison
  const userEmail = req.user.email.toLowerCase();

  const tasks = await Task.find(
    {
      $or: [{ createdBy: req.user._id }, { assignedTo: userEmail }],
      deleted: { $ne: true },
    },
    excludeVField
  )
    .populate("createdBy", "name email")
    .sort({ createdOn: -1 });

  // Filter deleted comments from all tasks and ensure IDs are included
  const tasksWithFilteredComments = tasks.map((task) => {
    const taskObj = task.toObject();
    taskObj.comments = taskObj.comments
      .filter((comment) => !comment.deleted)
      .map((comment) => ({
        ...comment,
        _id: comment._id || comment.id,
      }));
    return taskObj;
  });

  res.send(tasksWithFilteredComments);
});

// Get tasks created by me but not assigned to me
// Returns tasks where user is the creator but NOT assigned to the user by email
// Excludes deleted tasks
router.get("/created-by-me", auth, async (req, res) => {
  // Convert email to lowercase for consistent comparison
  const userEmail = req.user.email.toLowerCase();

  const tasks = await Task.find(
    {
      createdBy: req.user._id,
      assignedTo: { $ne: userEmail },
      deleted: { $ne: true },
    },
    excludeVField
  )
    .populate("createdBy", "name email")
    .sort({ createdOn: -1 });

  // Filter deleted comments from all tasks and ensure IDs are included
  const tasksWithFilteredComments = tasks.map((task) => {
    const taskObj = task.toObject();
    taskObj.comments = taskObj.comments
      .filter((comment) => !comment.deleted)
      .map((comment) => ({
        ...comment,
        _id: comment._id || comment.id,
      }));
    return taskObj;
  });

  res.send(tasksWithFilteredComments);
});

// Get categories with statistics
// Returns categories with task count and percentage done
router.get("/categories", auth, async (req, res) => {
  // Convert email to lowercase for consistent comparison
  const userEmail = req.user.email.toLowerCase();

  const tasks = await Task.find({
    $or: [{ createdBy: req.user._id }, { assignedTo: userEmail }],
    deleted: { $ne: true },
  });

  // Group tasks by category
  const categoryMap = new Map();

  tasks.forEach((task) => {
    task.categories.forEach((categoryName) => {
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          totalTasks: 0,
          completedTasks: 0,
        });
      }

      const category = categoryMap.get(categoryName);
      category.totalTasks += 1;
      if (task.status === "completed") {
        category.completedTasks += 1;
      }
    });
  });

  // Convert to array and calculate percentages
  const categories = Array.from(categoryMap.values()).map((category) => ({
    name: category.name,
    projectCount: category.totalTasks,
    percentage:
      category.totalTasks > 0
        ? Math.round((category.completedTasks / category.totalTasks) * 100)
        : 0,
  }));

  res.send(categories);
});

// Add comment to a task (must be before /:id route)
router.post("/:id/comments", auth, async (req, res) => {
  const { comment } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).send("Comment is required.");
  }

  // Convert email to lowercase for consistent comparison
  const userEmail = req.user.email.toLowerCase();

  const task = await Task.findOne({
    _id: req.params.id,
    $or: [{ createdBy: req.user._id }, { assignedTo: userEmail }],
    deleted: { $ne: true },
  });

  if (!task) {
    return res.status(404).send("The task with the given ID does not exist.");
  }

  // Get user name from JWT token
  const userName = req.user.name || req.user.email || "User";

  const newComment = {
    name: userName,
    comment: comment.trim(),
    createdAt: new Date(),
    deleted: false,
  };

  task.comments.push(newComment);
  const updatedTask = await task.save();

  const populatedTask = await Task.findById(updatedTask._id)
    .select(excludeVField)
    .populate("createdBy", "name email");

  // Filter deleted comments and ensure IDs are included
  populatedTask.comments = populatedTask.comments
    .filter((comment) => !comment.deleted)
    .map((comment) => {
      const commentObj = comment.toObject ? comment.toObject() : comment;
      return {
        ...commentObj,
        _id: commentObj._id || commentObj.id,
      };
    });

  res.send(populatedTask);
});

// Delete comment (mark as deleted) (must be before /:id route)
router.delete("/:id/comments/:commentId", auth, async (req, res) => {
  // Convert email to lowercase for consistent comparison
  const userEmail = req.user.email.toLowerCase();

  const task = await Task.findOne({
    _id: req.params.id,
    $or: [{ createdBy: req.user._id }, { assignedTo: userEmail }],
    deleted: { $ne: true },
  });

  if (!task) {
    return res.status(404).send("The task with the given ID does not exist.");
  }

  // Find comment by ID - Mongoose subdocuments use .id() method
  const comment = task.comments.id(req.params.commentId);
  if (!comment) {
    // Try finding by index if ID doesn't work (fallback)
    const commentIndex = task.comments.findIndex(
      (c) =>
        c.id === req.params.commentId ||
        c._id?.toString() === req.params.commentId
    );
    if (commentIndex === -1) {
      return res
        .status(404)
        .send("The comment with the given ID does not exist.");
    }
    task.comments[commentIndex].deleted = true;
  } else {
    // Mark comment as deleted
    comment.deleted = true;
  }
  const updatedTask = await task.save();

  const populatedTask = await Task.findById(updatedTask._id)
    .select(excludeVField)
    .populate("createdBy", "name email");

  // Filter deleted comments and ensure IDs are included
  populatedTask.comments = populatedTask.comments
    .filter((comment) => !comment.deleted)
    .map((comment) => {
      const commentObj = comment.toObject ? comment.toObject() : comment;
      return {
        ...commentObj,
        _id: commentObj._id || commentObj.id,
      };
    });

  res.send(populatedTask);
});

// Get task by ID
// Returns task if user is the creator OR assigned to the user by email
// Excludes deleted tasks
router.get("/:id", auth, async (req, res) => {
  // Convert email to lowercase for consistent comparison
  const userEmail = req.user.email.toLowerCase();

  const task = await Task.findOne({
    _id: req.params.id,
    $or: [{ createdBy: req.user._id }, { assignedTo: userEmail }],
    deleted: { $ne: true },
  })
    .select(excludeVField)
    .populate("createdBy", "name email");

  if (!task) {
    return res.status(404).send("The task with the given ID does not exist.");
  }

  // Filter deleted comments and ensure IDs are included
  task.comments = task.comments
    .filter((comment) => !comment.deleted)
    .map((comment) => {
      const commentObj = comment.toObject ? comment.toObject() : comment;
      return {
        ...commentObj,
        _id: commentObj._id || commentObj.id,
      };
    });

  res.send(task);
});

// Create a new task
router.post("/", auth, async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // If assignedTo is not provided, use the creator's email from the token
  // If assignedTo is provided, use that email
  // Convert to lowercase for consistent comparison
  const userEmail = req.user.email.toLowerCase();
  const assignedToEmail = req.body.assignedTo
    ? req.body.assignedTo.toLowerCase()
    : userEmail;

  const task = new Task({
    ...req.body,
    createdBy: req.user._id,
    assignedTo: assignedToEmail,
  });

  await task.save();

  const populatedTask = await Task.findById(task._id)
    .select(excludeVField)
    .populate("createdBy", "name email");

  // Filter deleted comments and ensure IDs are included
  populatedTask.comments = populatedTask.comments
    .filter((comment) => !comment.deleted)
    .map((comment) => {
      const commentObj = comment.toObject ? comment.toObject() : comment;
      return {
        ...commentObj,
        _id: commentObj._id || commentObj.id,
      };
    });

  res.send(populatedTask);
});

// Update task by ID
// Only allows update if user is the creator OR assigned to the user by email
router.put("/:id", auth, async (req, res) => {
  const { error } = validateUpdate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  // Convert email to lowercase for consistent comparison
  const userEmail = req.user.email.toLowerCase();

  const task = await Task.findOne({
    _id: req.params.id,
    $or: [{ createdBy: req.user._id }, { assignedTo: userEmail }],
    deleted: { $ne: true },
  });

  if (!task) {
    return res.status(404).send("The task with the given ID does not exist.");
  }

  // Handle comments update - filter out deleted comments
  if (req.body.comments) {
    req.body.comments = req.body.comments.filter((comment) => !comment.deleted);
  }

  // If assignedTo is provided in the update, convert to lowercase
  // Otherwise, keep the existing assignedTo value
  const updateData = { ...req.body };
  if (updateData.assignedTo !== undefined && updateData.assignedTo !== "") {
    updateData.assignedTo = updateData.assignedTo.toLowerCase();
  } else {
    // Remove assignedTo from update if not provided, to keep existing value
    delete updateData.assignedTo;
  }

  Object.assign(task, updateData);
  const updatedTask = await task.save();

  // Filter out deleted comments before sending
  const populatedTask = await Task.findById(updatedTask._id)
    .select(excludeVField)
    .populate("createdBy", "name email");

  // Filter deleted comments and ensure IDs are included
  populatedTask.comments = populatedTask.comments
    .filter((comment) => !comment.deleted)
    .map((comment) => {
      const commentObj = comment.toObject ? comment.toObject() : comment;
      return {
        ...commentObj,
        _id: commentObj._id || commentObj.id,
      };
    });

  res.send(populatedTask);
});

// Delete task by ID (marks as deleted instead of actually deleting)
// Allows delete if user is the creator OR assigned to the task
router.delete("/:id", auth, async (req, res) => {
  // Convert email to lowercase for consistent comparison
  const userEmail = req.user.email.toLowerCase();

  const task = await Task.findOne({
    _id: req.params.id,
    $or: [{ createdBy: req.user._id }, { assignedTo: userEmail }],
    deleted: { $ne: true },
  });

  if (!task) {
    return res
      .status(404)
      .send(
        "The task with the given ID does not exist or you don't have permission to delete it."
      );
  }

  task.deleted = true;
  const deletedTask = await task.save();

  const populatedTask = await Task.findById(deletedTask._id)
    .select(excludeVField)
    .populate("createdBy", "name email");

  // Filter deleted comments
  populatedTask.comments = populatedTask.comments
    .filter((comment) => !comment.deleted)
    .map((comment) => {
      const commentObj = comment.toObject ? comment.toObject() : comment;
      return {
        ...commentObj,
        _id: commentObj._id || commentObj.id,
      };
    });

  res.send(populatedTask);
});

module.exports = router;
