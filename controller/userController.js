const User = require("./../models/userModel");
const APIFeatures = require("./../utils/apiFeatures");
// const multer = require("multer");
// const sharp = require("sharp");

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.followUser = async (req, res, next) => {
  try {
    const currentUser = req.user.id; // ID of the current user (follower)
    const userToFollow = req.body.userId; // ID of the user to be followed
    // console.log(userToFollow);
    // Find the current user and the user to be followed
    const user = await User.findById(currentUser);
    const followUser = await User.findById(userToFollow);
    // console.log(user);
    // console.log(followUser);
    // Check if the user to be followed exists
    if (!followUser) {
      return res.status(404).json({
        status: "error",
        message: "User to follow not found.",
      });
    }

    // Check if the current user is already following the user to be followed
    if (user.following.includes(userToFollow)) {
      return res.status(400).json({
        status: "error",
        message: "You are already following this user.",
      });
    }

    // Update both current user's following array and the user to be followed's followers array
    await Promise.all([
      User.updateOne(
        { _id: currentUser },
        { $addToSet: { following: userToFollow } }
      ),
      User.updateOne(
        { _id: userToFollow },
        { $addToSet: { followers: currentUser } }
      ),
    ]);

    res.status(200).json({
      status: "success",
      message: "Successfully followed the user.",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to follow user.",
      error: err.message,
    });
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    // 1) Create Error if user is trying to change password
    if (req.body.password || req.body.passwordConfirm) {
      return res.status(400).json({
        status: "fail",
        message:
          "This route is not for password updates. Please use /updateMyPassword.",
      });
    }

    // 2) Filter out unwanted field names that are not allowed to be updated
    const filterBody = filterObj(
      req.body,
      "username",
      "name",
      "photo",
      "email",
      "phone",
      "bio",
      "passion"
    );

    // 3) Remove fields from the filterBody that are empty or null
    for (const key in filterBody) {
      if (filterBody[key] === "" || filterBody[key] === null) {
        delete filterBody[key];
      }
    }

    // 4) Update user document if there are valid fields to update
    if (Object.keys(filterBody).length > 0) {
      const updateUser = await User.findByIdAndUpdate(req.user.id, filterBody, {
        new: true,
        runValidators: true,
      });

      return res.status(200).json({
        status: "success",
        data: {
          user: updateUser,
        },
      });
    } else {
      // No valid fields to update
      return res.status(400).json({
        status: "fail",
        message: "No valid fields provided for update.",
      });
    }
  } catch (err) {
    // Handle errors
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

// Function to delete the user account by setting "active:false" in userSchema
exports.deleteMe = async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: "success",
    data: null,
  });
};
////

exports.getAllUsers = async (req, res, next) => {
  try {
    const features = new APIFeatures(User.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const users = await features.query;
    res.status(200).json({
      status: "success",
      results: users.length,
      data: {
        users,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "error",
      message: "Failed to find the users.",
      error: err.message,
    });
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("followers", "name username photo verified")
      .populate("following", "name username photo verified");

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found with the provided ID.",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "error",
      message: "Failed to find the user.",
      error: err.message,
    });
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const newUser = await User.create(req.body);
    res.status(201).json({
      status: "success",
      data: {
        data: newUser,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to create the user.",
      error: err.message,
    });
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      status: "success",
      data: {
        data: updatedUser,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to update the user.",
      error: err.message,
    });
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete the user.",
    });
  }
};
