import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Link to User model
  pets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Pet" }], // Array of pet IDs in wishlist
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Wishlist", wishlistSchema);
