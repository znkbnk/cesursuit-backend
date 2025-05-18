const mongoose = require("mongoose");

const suitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  price: {
    type: Number,
    required: function () {
      return !this.isComingSoon; // Price is required only if isComingSoon is false
    },
  },
  fit: {
    type: String,
    required: true,
  },
  style: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
    default: 0, // Default to 0 for new products
  },
  image: {
    type: String,
    required: true,
  },
  images: {
    type: [String],
    default: [],
  },
  sizeInventory: [
    {
      size: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
  isComingSoon: {
    type: Boolean,
    default: false, // Default to false (normal product)
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Suit", suitSchema);
