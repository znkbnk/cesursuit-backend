const mongoose = require("mongoose");

const suitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  fabric: {
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
  },
  image: {
    type: String, // Store main image as Base64 string
    required: true,
  },
  images: {
    type: [String], // Store secondary images as array of Base64 strings
    default: [],
  },
  sizes: {
    type: [String],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Suit", suitSchema);