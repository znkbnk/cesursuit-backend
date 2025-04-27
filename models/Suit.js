const mongoose = require('mongoose');

const suitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  fabric: { type: String, required: true },
  style: { type: String, enum: ['tuxedo', 'overcoat', 'business', 'casual', 'blazer', 'trenchcoat'], required: true },
  description: { type: String, required: true },
  stock: { type: Number, required: true },
  image: { type: String, required: true },
  images: [{ type: String }], // Array for additional images
  sizes: [{ type: String, enum: ['S', 'M', 'L', 'XL'] }], // Available sizes
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Suit', suitSchema);