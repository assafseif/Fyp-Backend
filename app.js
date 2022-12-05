import express from "express";
import postRoutes from "./routes/postRouter.js";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import "./config/MongoConfig.js";
import favoriteRoutes from "./routes/favorite.js";
import * as dotenv from "dotenv";
import { errorHandler } from "./util/errorHandler.js";

dotenv.config();

//INITIALIZATION

const app = express();
app.use(cors());
app.use(bodyParser());

//ROUTES
app.use("/auth", authRoutes);
app.use(postRoutes);
app.use(favoriteRoutes);

//ERROR HANDLERS
app.use(errorHandler);

app.listen(8080, () => {
  console.log(`you joined host ${process.env.PORT}`);
});
