const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed password
  address: { type: String },
  phone: { type: String },
  profilePicture: { type: String, default:"def" }, // URL to the profile picture
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
