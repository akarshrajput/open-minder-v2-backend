const mongoose = require("mongoose");

const notesSchema = new mongoose.Schema({
  content: {
    type: String,
    reqired: [true, "A Note must have content"],
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "A Note must have Author"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

notesSchema.pre(/^find/, function (next) {
  this.populate({
    path: "author",
    select: "name username email verified photo",
  });
  next();
});

notesSchema.virtual("authorId").get(function () {
  const author = this.get("author");
  const authorinfo = author._id;
  return `${authorinfo}`;
});

const Note = mongoose.model("Note", notesSchema);
module.exports = Note;
