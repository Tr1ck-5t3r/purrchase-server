const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Pet = require("../models/Pet");
const Order = require("../models/Orders"); // Ensure the file name matches your model file
const Cart = require("../models/Cart");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config(); 

// --- Authentication Middleware (Place this before your protected routes) ---
const authenticateToken = (req, res, next) => {
  // Get token from the Authorization header (Bearer TOKEN)
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token part

  if (token == null) {
    // No token provided
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Token is invalid (expired, wrong secret, etc.)
      console.error("JWT Verification Error:", err.message);
      if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Unauthorized: Token expired' });
      }
      return res.status(403).json({ error: 'Forbidden: Invalid token' }); // Or 401
    }

    // Token is valid, attach payload to request object (often contains userId)
    // The payload is whatever you signed in the login route: { userId: user._id, username: user.username }
    req.user = decoded; // Make decoded payload available as req.user
    // console.log("Authenticated User:", req.user); // Optional: log authenticated user ID/info
    next(); // Proceed to the next middleware or route handler
  });
};

router.get('/', (req, res) => {
    res.send('Hello World!');
});

router.post("/register", async (req, res) => {
  console.log("Registration Request");
  console.log("Registration Request Body:", req.body); // <-- Improve logging
  try {
    const { username, email, password, address , phone} =
      req.body;

    // Check if username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Username or email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      address,
      phone,
      profilePicture: `https://eu.ui-avatars.com/api/?name=${username}&size=128&background=random`,
      createdAt: new Date(),
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully" });
    console.log("User registered successfully:", user); // <-- Improve logging
  } catch (error) {
    console.error("Registration Error:", error); // <-- Improve logging
    res
      .status(500)
      .json({ error: "Registration failed", details: error.message });
  }
});


router.post("/login", async (req, res) => {
  console.log("Login Request Body:", req.body); // <-- Improve logging
  try {
    const { email, password } = req.body;

    // 🔹 Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // 🔹 Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // 🔹 Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // 🔹 Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 🔹 Return token + user info
    res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, username: user.username, email: user.email, address: user.address, phone: user.phone, profilePicture: user.profilePicture },
    });
  } catch (error) {
    console.error("Login error:", error); // Log error for debugging
    res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/find", async (req, res) => {
  // Now you can optionally use req.user if needed, e.g., req.user.userId
  try {
    const pets = await Pet.find();
    res.json(pets);
  } catch (err) {
    console.error("Error fetching pets:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch pets", details: err.message });
  }
});

// Example: Protect the /gallery route
router.get("/gallery", async (req, res) => {
  try {
    const pets = await Pet.find().sort({ _id: -1 }).limit(20);
    res.json(pets);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        error: "An error occurred while fetching the gallery.",
        details: err.message,
      }); // Send JSON error
  }
});

// Fetches the current logged-in user's profile data
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    // req.user.userId comes from the authenticateToken middleware
    const user = await User.findById(req.user.userId).select('-password'); // Exclude password hash

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user); // Send user data back
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch profile", details: error.message });
  }
});


router.put("/profile", authenticateToken, async (req, res) => {
  // Data to update comes from the request body
  const { username, email, address, phone } = req.body;
  const userId = req.user.userId; // Get user ID from the authenticated token

  // Basic validation
  if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required.' });
  }

  try {
    // Check if the new username or email is already taken by *another* user
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
      _id: { $ne: userId } // Important: Exclude the current user from the check
    });

    if (existingUser) {
      let errorMessage = "Update failed: ";
      if (existingUser.username === username) {
        errorMessage += "Username already taken by another user.";
      } else if (existingUser.email === email) {
        errorMessage += "Email already registered by another user.";
      }
      return res.status(400).json({ error: errorMessage });
    }

    // Prepare update data - only include fields provided in the request
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (address !== undefined) updateData.address = address; // Allow empty string
    if (phone !== undefined) updateData.phone = phone;     // Allow empty string

    // Find the user by ID (from token) and update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true, context: 'query' } // Return updated doc, run schema validators
    ).select('-password'); // Exclude password from the response

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found for update" });
    }

    // Respond with success and the updated user data (excluding password)
    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Profile Update Error:", error);
    // Handle potential validation errors from Mongoose
    if (error.name === 'ValidationError') {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Profile update failed", details: error.message });
  }
});


module.exports = router;   
