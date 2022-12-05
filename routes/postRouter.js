import Router from "express";
import isAuth from "../middleware/is-auth.js";
const router = Router();
import * as PostController from "../controllers/postController.js";

router.post("/add-post", isAuth, PostController.addPost);

router.post("/edit-post/:postId", isAuth, PostController.editPost);

router.get("/get-post", PostController.fetchPost);

router.delete(
  "/delete-post/:postId",
  isAuth,
  PostController.deletePost
);

router.patch(
  "/edit-post/:postId",
  isAuth,
  PostController.editPost
);

router.get(
  "/get-post/:postId",
  isAuth,
  PostController.getPost
);

router.get("/my-posts", isAuth, PostController.myPosts);
export default router;
