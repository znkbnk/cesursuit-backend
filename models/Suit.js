const mongoose = require('mongoose');

const suitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  fabric: { type: String, required: true },
  style: { type: String, enum: ['tuxedo', 'overcoat', 'business', 'casual', 'blazer', 'trenchcoat'], required: true },
  description: { type: String, required: true },
  stock: { type: Number, required: true },
  image: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Suit', suitSchema);