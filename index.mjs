// index.js (ESM version)

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import mainRouter from "./routes/routes.js"; // Make sure this file uses export default

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- CORS Configuration ---
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// --- Connect to MongoDB ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// --- Core Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// --- Routes ---
app.use("/", mainRouter);

// --- Error Handler ---
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack);
  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: err.message || "Something went wrong!",
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
