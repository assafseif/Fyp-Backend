import mongoose from "mongoose";
import Post from "../models/post.js";
import User from "../models/user.js";
import Favorite from "../models/AddToFavorite.js";


export const addPost = async (req, res, next) => {
  const { title, description, videoUrl } = req.body;
  const user = await User.findOne({ _id: req.userId });

  if (!user || !user.admin) {
    return res.status(404).json({
      messageError: "NO USER OR NOT AUTHENTICATE",
    });
  }
  try {
    const newPost = new Post({
      title: title,
      description: description,
      videoUrl: videoUrl,
      creator: user.id,
    });

    const awaitedPost = await newPost.save();
    return res.status(200).json({
      message: "done",
      awaitedPost: awaitedPost,
    });
  } catch (err) {
    next(err);
  }
};

export const deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const user = await User.findOne({ _id: req.userId });
    if (!user) {
      return res.status(404).json({ message: "you are not authenticate here" });
    }

    const post = await Post.findOne({ _id: postId });
    if (!post) {
      return res.status(404).json({ message: "no Post to delete" });
    }

    const awaitedDelete = await post.deleteOne({ _id: postId });
    const UpdatedFavorite = await Favorite.updateOne(
      {
        "posts.postId": { $in: [postId] },
      },
      { $pull: { posts: { postId: postId } } }
    );

    console.log(UpdatedFavorite)

    return res
      .status(200)
      .json({ message: "deleted", awaitedDelete: awaitedDelete });
  } catch (err) {
    throw new Error(err);
  }
};

export const fetchPost = async (req, res, next) => {
  const page = req.query.page || 1;
  const search = req.query.search;
  const PER_PAGE = 4;
  try {
    let Posts;
    const count = await Post.find().countDocuments();
    search
      ? (Posts = await Post.find({
          $or: [
            { title: { $regex: search } },
            { description: { $regex: search } },
          ],
        })

          .skip((page - 1) * PER_PAGE)
          .limit(PER_PAGE))
      : (Posts = await Post.find()
          .skip((page - 1) * PER_PAGE)
          .limit(PER_PAGE));

    if (Posts.length < 0) {
      return res.status(404).json({ message: "no Posts" });
    }
    return res.status(200).json({
      success: true,
      Posts: Posts,
      count: count,
      message: "Fetched Done!",
    });
  } catch (err) {
    next(err);
  }
};

export const myPosts = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.userId });
    if (!user || !user.admin) {
      return res.status(404).json({ message: "you are not authenticate here" });
    }

    const Posts = await Post.find(); //{ creator: req.userId }

    if (Posts.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NotFound 404",
        message: "there is no Posts for this user",
      });
    } else {
      return res.status(200).json({
        success: true,
        Posts: Posts,
        message: "Fetched Done!",
      });
    }
  } catch (err) {
    throw new Error(err);
  }
};

export const editPost = async (req, res, next) => {
  const { title, description, videoUrl } = req.body;
  const postId = req.params.postId;

  try {
    const user = await User.findOne({ _id: req.userId });

    if (!user || !user.admin) {
      return res.status(409).json({
        success: false,
        error: "NotFound or Not authenticate",
        message: "NotFound or Not authenticate",
      });
    }

    const post = await Post.findOne({ _id: postId });
    if (!post) {
      return res.status(409).json({
        success: false,
        error: "NotFound",
        message: "post not found..",
      });
    }

    post.title = title;
    post.description = description;
    post.videoUrl = videoUrl;

    const awaitedPost = await post.save();

    return res.status(200).json({
      success: true,
      message: "Post updated!",
      awaitedPost,
    });
  } catch (err) {
    res.status(503).json({
      message: "Serve side Error Edit",
    });
  }
};

export const getPost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const user = await User.findOne({ _id: req.userId });

    if (!user || !user.admin) {
      return res.status(409).json({
        success: false,
        error: "NotFound or Not authenticate",
        message: "NotFound or Not authenticate",
      });
    }

    const post = await Post.findOne({ _id: postId });

    if (!post) {
      return res.status(409).json({
        success: false,
        error: "NotFound",
        message: "post not found..",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Post fetched!",
      data: post,
    });
  } catch (err) {
    next(err);
  }
};
