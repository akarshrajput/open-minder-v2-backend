const Memory = require("./../models/memoryModel");
const APIFeatures = require("./../utils/apiFeatures");

exports.getAllMemories = async (req, res, next) => {
  try {
    const features = new APIFeatures(Memory.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const memories = await features.query;
    res.status(200).json({
      status: "success",
      results: memories.length,
      data: {
        memories,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "error",
      message: "Failed to find the memories.",
      error: err.message,
    });
  }
};

exports.getMemory = async (req, res, next) => {
  try {
    const memory = await Memory.findById(req.params.id);

    if (!memory) {
      return res.status(404).json({
        status: "error",
        message: "Memory not found with the provided ID.",
      });
    }

    memory.views += 1;
    await memory.save();

    res.status(200).json({
      status: "success",
      data: {
        memory,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "error",
      message: "Failed to find the Memory.",
      error: err.message,
    });
  }
};

exports.createMemory = async (req, res, next) => {
  if (!req.body.author) req.body.author = req.user.id;
  try {
    const newMemory = await Memory.create(req.body);
    res.status(201).json({
      status: "success",
      data: {
        data: newMemory,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to create the Memory.",
      error: err.message,
    });
  }
};

exports.updateMemory = async (req, res, next) => {
  try {
    updatedMemory = await Memory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      status: "success",
      data: {
        data: updatedMemory,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to update the Memory.",
      error: err.message,
    });
  }
};

exports.deleteMemory = async (req, res, next) => {
  try {
    const memory = await Memory.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete the Memory.",
    });
  }
};
