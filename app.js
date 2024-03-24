const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const userRouter = require("./routes/userRoutes");
const blogRouter = require("./routes/blogRoutes");
const memoryRouter = require("./routes/memoryRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use(cookieParser());

app.use("/api/v1/users", userRouter);
app.use("/api/v1/blogs", blogRouter);
app.use("/api/v1/memories", memoryRouter);

// Handle Error of all routes
app.all("*", (req, res, next) => {
  next(
    res.status(404).json({
      status: "error",
      message: `Can't find ${req.originalUrl} on this server!`,
    })
  );
});

module.exports = app;
