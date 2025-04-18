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

/* const allowedOrigins = [
  process.env.URL, // Your main production frontend URL
  process.env.FRONTEND_DEV_URL || "http://localhost:5173", // Your local dev URL
];

const corsOptions = {
  // origin can be a function for more complex logic
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if the origin is in our allowed list
    // Or if it matches a pattern for Vercel previews (see Option 2 below)
    if (allowedOrigins.indexOf(origin) !== -1) {
      // Origin is allowed
      return callback(null, true);
    } else {
      // Origin is not allowed
      console.warn(`CORS: Blocked origin: ${origin}`); // Log blocked origins
      return callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// --- CORS Configuration ---
console.log("Allowed CORS Origins:", allowedOrigins.filter(Boolean)); // Log defined origins
app.use(cors(corsOptions));
 */

app.use(
  cors({
    origin: true, // Reflect the request origin; allows any origin to make requests
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // <<< This WILL work with origin: true
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
