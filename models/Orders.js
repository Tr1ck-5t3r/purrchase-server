// models/Order.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
    },
    razorpayOrderId: {
      type: String,
      // required: true, // <--- REMOVE THIS LINE
      unique: true, // Keep unique constraint
      index: true,
      sparse: true, // Add sparse index because it can be null initially but must be unique when present
    },
    razorpayPaymentId: {
      type: String,
      index: true,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["created", "attempted", "paid", "failed"],
      default: "created",
      index: true,
    },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, pet: 1 });

export default mongoose.model("Order", orderSchema);
