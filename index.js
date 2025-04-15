const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors"); // Import CORS
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- CORS Configuration (Apply early) ---
app.use(
  cors({
    origin: "http://localhost:5173", // Allow requests only from this frontend URL
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Added OPTIONS for preflight requests
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
    credentials: true, // Optional: If you need to handle cookies or sessions across origins
  })
);

// --- Connect to MongoDB ---
// Remove deprecated options if using Mongoose v6+
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit if DB connection fails on startup
  });

// --- Core Middleware ---
app.use(express.json()); // Built-in JSON parser
app.use(express.urlencoded({ extended: true })); // Built-in URL-encoded parser
app.use(express.static("public")); // Serve static files (e.g., images)

// --- Routes ---
const mainRouter = require("./routes/routes.js"); // Rename variable for clarity
app.use("/", mainRouter); // Mount your main router

// --- Basic Error Handling (Optional but Recommended) ---
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
