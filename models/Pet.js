// models/Pet.js
import mongoose from "mongoose"; // Or const mongoose = require('mongoose');

const petSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    breed: { type: String, required: true },
    species: {
      type: String,
      enum: ["dog", "cat", "bird", "fish", "other"],
      required: true,
    },
    age: { type: Number, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    images: [{ type: String }], // Array of image URLs or Cloudinary public IDs
    available: { type: Boolean, default: true, index: true }, // Important: Index for faster querying
    createdAt: { type: Date, default: Date.now },
    // --- New/Updated Fields ---
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User who adopted the pet
      default: null, // Starts as null
      index: true, // Index for querying user's pets
    },
    adoptionDate: {
      // Optional: Track when the pet was marked as adopted
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
); // Adds createdAt and updatedAt automatically

// Ensure only one owner per pet (implicit via available=false check, but good practice)
// petSchema.index({ owner: 1 }, { unique: true, sparse: true }); // Only enforce uniqueness if owner is not null

export default mongoose.model("Pet", petSchema);
// Or: module.exports = mongoose.model("Pet", petSchema);
