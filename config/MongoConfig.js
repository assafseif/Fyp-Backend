import * as dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

mongoose
  //CONNECT TO DATABASE
  .connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => console.log(err.message));

mongoose.connection.on("connected", () => {
  console.log("Mongoose connection is UP.");
});
mongoose.connection.on("error", (err) => {
  console.log(err.message);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose connection is DOWN.");
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  process.exit(0);
});
