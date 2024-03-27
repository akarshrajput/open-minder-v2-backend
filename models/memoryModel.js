const mongoose = require("mongoose");

const memorySchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "Memories must have data"],
      trim: true,
      maxlength: [100, "Memories must have less than 100 characters"],
    },
    author: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "User should be present in memory"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    views: {
      type: Number,
      default: 0,
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

memorySchema.virtual("authorId").get(function () {
  const author = this.get("author");
  const authorinfo = author._id;
  return `${authorinfo}`;
});

const Memory = mongoose.model("Memory", memorySchema);
module.exports = Memory;
