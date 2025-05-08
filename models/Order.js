const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    uid: { type: String, required: true },
    email: { type: String, required: true },
    displayName: { type: String },
    companyName: { type: String, default: "" },
    mobileNumber: { type: String, default: "" },
  },
  items: [
    {
      suit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Suit",
        required: true,
      },
      size: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  status: {
    type: String,
    enum: ["pending", "confirmed", "shipped", "cancelled"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", orderSchema);