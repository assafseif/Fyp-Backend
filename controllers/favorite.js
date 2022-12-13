import mongoose from "mongoose";
import Post from "../models/post.js";
import User from "../models/user.js";
import Favorite from "../models/AddToFavorite.js";


//ADD TO FAVORITE
export const AddToFavorite = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const user = await User.findOne({ _id: req.userId });
    if (!user) {
      return res.status(404).json({ message: "you are not authenticate here" });
    }
    const post = await Post.findOne({ _id: postId });
    if (!post) {
      return res.status(503).json({ message: "503 Server error" });
    }
    // const addtofavorite = new Favorite({
    //   userId: req.userId,
    //   posts: [
    //     {
    //       postId: post,
    //       quantity: 0,
    //     },
    //   ],
    // });
    const findfavorite = await Favorite.findOne({
      userId: req.userId,
      "posts.postId": { $in: [postId] },
    });

    if (findfavorite) {
      return res.status(503).json({ message: "503 Server error" });
    }

    const favorite = await Favorite.findOne({ userId: req.userId });
    favorite.posts.push({ postId: post, quantity: 0 });

    const awaitedFavorite = await favorite.save();
    return res.status(200).json({ message: "done", addtofavorite: awaitedFavorite });
  } catch (err) {
    next(err);
  }
};

export const RemoveFromFavorite = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const user = await User.findOne({ _id: req.userId });
    if (!user) {
      return res.status(404).json({ message: "you are not authenticate here" });
    }

    const favorite = await Favorite.findOne({
      userId: req.userId,
      "posts.postId": { $in: [postId] },
    });
    if (!favorite) {
      return res.status(503).json({ message: "503 Server error" });
    }
    const UpdatedFavorite = await Favorite.updateOne(
      {
        "posts.postId": { $in: [postId] },
      },
      { $pull: { posts: { postId: postId } } }
    );
    return res.status(200).json({ removeFromFavorite: UpdatedFavorite });
  } catch (err) {
    next(err);
  }
};

export const FavoriteList = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.userId });
    if (!user) {
      return res.status(404).json({ message: "you are not authenticate here" });
    }

    const favorites = await Favorite.findOne({
      userId: req.userId,
    }).populate("posts.postId");
    if (!favorites) {
      return res.status(404).json({ message: "There no favorites" });
    }

    return res.status(200).json({ favorites: favorites });
  } catch (err) {
    next(err);
  }
};
 