import mongoose from "mongoose";
import { config } from "../config.js";

const connectDB = async () => {
  try {
    console.log("ENV MONGODB_URI:", process.env.MONGODB_URI);
    console.log("Mongo URL being used:", config.mongoUrl);

    if (!config.mongoUrl) {
      throw new Error("MONGODB_URI is missing");
    }

    await mongoose.connect(config.mongoUrl);

    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;