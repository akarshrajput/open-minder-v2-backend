const mongoose = require("mongoose");

const memorySchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "Memories must have data"],
      trim: true,
      maxlength: [200, "Memories must have less than 200 characters"],
    },
    author: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "User should be present in memory"],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

memorySchema.pre(/^find/, function (next) {
  this.populate({
    path: "author",
    select: "name username email verified photo",
  });
  next();
});

const Memory = mongoose.model("Memory", memorySchema);
module.exports = Memory;
