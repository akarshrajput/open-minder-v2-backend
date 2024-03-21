const jwt = require("jsonwebtoken");
const User = require("./../models/userModel");
const { promisify } = require("util");

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Send token via cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    secure: true, // Cookie will only be sent over https(set it to true in production mode)
    httpOnly: true, // Cookie will not be access or modified by Browser
  };
  res.cookie("jwt", token, cookieOptions);

  // Hide Password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = async (req, res) => {
  try {
    const newUser = await User.create({
      name: req.body.name,
      username: req.body.username,
      email: req.body.email,
      phone: req.body.phone,
      passion: req.body.passion,
      bio: req.body.bio,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      passwordChangedAt: req.body.passwordChangedAt,
    });
    createSendToken(newUser, 201, res);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({
      status: "error",
      message: err.message,
    });
  }
};

exports.login = async (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username) {
    return res.status(400).json({
      status: "error",
      message: "Please provide Username",
    });
  }
  if (!password) {
    return res.status(400).json({
      status: "error",
      message: "Please provide Password",
    });
  }

  const user = await User.findOne({ username }).select("+password"); // We use("+password") to include password because we have disable password in userModel.js using select:false

  if (!user || !(await user.correctPassword(password, user.password))) {
    return res.status(401).json({
      status: "error",
      message: "Incorrect Email or Password",
    });
  }
  createSendToken(user, 200, res);
};

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: "success",
  });
};

exports.protect = async (req, res, next) => {
  // Ensure req.locals is always an object
  // 1) Getting token(from header) and check if its there
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    // console.log(token); // -> Token from headers

    if (!token) {
      // If there is no token then the user will not get access to protected routes and get an error
      return res.status(401).json({
        status: "error",
        message: "You are not logged in! Please log in to get access",
      });
    }
    // 2) Verification(Check if someone manipulates data or token expired)
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    // console.log(decoded);
    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: "error",
        message: "The user belonging to this token does no longer exist.",
      });
    }
    // 4) Check if the user changed the password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: "error",
        message: "User recently changed the password! Please log in again.",
      });
    }

    // If all above conditions satisfy, grant access to protected routes
    req.user = currentUser;
    res.locals.user = currentUser; // Set it here as well
  } catch (err) {
    // Handle JsonWebTokenError (malformed token) here
    console.error(err); // Log the error for debugging purposes
    return next(); // Allow the request to continue even if the token is malformed
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};

// Reset Password using reset token in forgot password
exports.forgotPassword = async (req, res, next) => {
  // 1) Get User based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "There is no user with this email address",
    });
  }
  // 2) Generate the random reset Token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you did'nt forgot your password, please ignore this message.`;
  try {
    // 3) Send it to user email
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/users/resetPassword/${resetToken}`;
    // await sendEmail({
    //   email: user.email,
    //   subject: `Your password reset token valid for 10 min`,
    //   message,
    // });
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Token sent to Email",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({
      status: "error",
      message: "There was an error sending the email. Try again Later",
    });
  }
  // next();
};

exports.resetPassword = async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Token is Invalid or is Expired",
    });
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // 3) Update "changedPasswordAt" property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
};

// Update the password when user is Logged In by confirming previous password
exports.updatePassword = async (req, res, next) => {
  try {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select("+password");

    // 2) Check if POSTed current user password is correct
    const isPasswordCorrect = await user.correctPassword(
      req.body.passwordCurrent
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: "error",
        message: "Your current password is wrong",
      });
    }

    // 3) If so, update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // 4) Log in user, send JWT
    createSendToken(user, 200, res);
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    // Extract the token from the headers or request body
    const token = req.headers.authorization.split(" ")[1];

    // Verify the token
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);

    // If verification is successful, send user information
    res.status(200).json({
      status: "success",
      data: {
        user: decoded.user,
      },
    });
  } catch (err) {
    // If verification fails, send an error response
    console.error(err);
    res.status(401).json({
      status: "fail",
      message: "Invalid token",
    });
  }
};
