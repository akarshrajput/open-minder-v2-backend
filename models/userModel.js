const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");
const crypto = require("crypto");
const { type } = require("os");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide your name."],
    maxlength: [40, "Name must not have more than 40 characters."],
  },
  username: {
    type: String,
    unique: [true, "Username already exist."],
    required: [true, "Please provide your username."],
    minlength: [5, "Username must have more than 5 characters."],
    maxlength: [20, "Username must have less than 20 characters."],
    lowercase: [true, "Username must have lowercase characters."],
  },
  email: {
    type: String,
    unique: [true, "Email already exist."],
    required: [true, "Please provide your email."],
    lowercase: [true, "Email must have lowercase characters."],
    validate: [validator.isEmail, "Please provide a valid email."],
  },
  photo: {
    type: String,
    default: "default.jpg",
  },
  phone: {
    type: String,
    maxlength: [20, "Phone number is not valid [exceeding more than limit]."],
    validate: [validator.isMobilePhone, "Please provide a valid Phone Number."],
  },
  passion: {
    type: String,
    default: "Not defined",
    maxlength: [100, "Passion must have less than 100 characters."],
  },
  bio: {
    type: String,
    maxlength: [500, "Bio must have less than 500 characters."],
    default: "Hi there 👋",
  },
  role: {
    type: String,
    enum: ["user", "guide", "admin"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    select: false, // It will be saved to database but will never appear for get request
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same",
    },
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  followers: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],
  following: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],
  verified: {
    type: Boolean,
    default: false,
  },
  accountCreatedAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Only run this function if the password is modified.
  // Hash password with code of 12 (default is 10)
  this.password = await bcrypt.hash(this.password, 12);
  // Delete password confirm
  this.passwordConfirm = undefined;
  next();
});

// To create "passowrdChangedAt" field when password is changed
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Query middleware to find only that users whose active field is not equal to false
userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  // False means password not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  // resetToken -> Random Token , passwordResetTokern -> Encrypted version of Random Token(which is saved to database)
  // console.log(resetToken, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // Expires in 10 minutes

  return resetToken; // We will use unencrypted token for email and store encrypted token in database
};

// userSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: "followers",
//     select: "name",
//   }).populate({
//     path: "following",
//     select: "name",
//   });
//   next();
// });

const User = mongoose.model("User", userSchema);
module.exports = User;
