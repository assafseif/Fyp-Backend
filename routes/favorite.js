import Router from "express";
import isAuth from "../middleware/is-auth.js";
import * as FavoriteController from "../controllers/favorite.js";

const router = Router();

router.post("/add-to-favorite/:postId", isAuth, FavoriteController.AddToFavorite);

router.delete(
  "/remove-from-favorite/:postId",
  isAuth,
  FavoriteController.RemoveFromFavorite
);

router.get("/my-favorites", isAuth, FavoriteController.FavoriteList);


export default router;
