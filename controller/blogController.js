const Blog = require("./../models/blogModel");
const APIFeatures = require("./../utils/apiFeatures");

exports.getAllBlogs = async (req, res, next) => {
  try {
    const features = new APIFeatures(Blog.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const blogs = await features.query;
    res.status(200).json({
      status: "success",
      results: blogs.length,
      data: {
        blogs,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "error",
      message: "Failed to find the blogs.",
      error: err.message,
    });
  }
};

exports.getBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        status: "error",
        message: "Blog not found with the provided ID.",
      });
    }

    blog.views += 1;
    await blog.save();

    res.status(200).json({
      status: "success",
      data: {
        blog,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "error",
      message: "Failed to find the blog.",
      error: err.message,
    });
  }
};

exports.createBlog = async (req, res, next) => {
  if (!req.body.author) req.body.author = req.id;
  try {
    const newBlog = await Blog.create(req.body);
    res.status(201).json({
      status: "success",
      data: {
        data: newBlog,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to create the blog.",
      error: err.message,
    });
  }
};

exports.updateBlog = async (req, res, next) => {
  try {
    updatedBlog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      status: "success",
      data: {
        data: updatedBlog,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to update the blog.",
      error: err.message,
    });
  }
};

exports.deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete the blog.",
    });
  }
};
