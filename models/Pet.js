const mongoose = require("mongoose");

const petSchema = new mongoose.Schema({
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
  images: [{ type: String }], // Array of image URLs
  available: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Pet", petSchema);
