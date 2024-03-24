const express = require("express");

const memoryController = require("./../controller/memoryController");
const authController = require("./../controller/authController");

const router = express.Router();

router
  .route("/")
  .get(memoryController.getAllMemories)
  .post(authController.protect, memoryController.createMemory);

router
  .route("/:id")
  .get(memoryController.getMemory)
  .patch(authController.protect, memoryController.updateMemory)
  .delete(authController.protect, memoryController.deleteMemory);

module.exports = router;
