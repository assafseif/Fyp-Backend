import mongoose from "mongoose";
const Schema = mongoose.Schema;

const FavoriteSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    posts: [
      {
        postId: {
          type: Schema.Types.ObjectId,
          ref: "Post",
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Favorite", FavoriteSchema);
