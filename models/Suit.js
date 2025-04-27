const mongoose = require('mongoose');

const suitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  fabric: { type: String, required: true },
  style: { type: String, enum: ['tuxedo', 'overcoat', 'business', 'casual', 'blazer', 'trenchcoat'], required: true },
  description: { type: String, required: true },
  stock: { type: Number, required: true },
  image: { type: String, required: true },
  images: [{ type: String }],
  sizes: [{ type: String, enum: ['S', 'M', 'L', 'XL'] }],
  createdAt: { type: Date, default: Date.now },
});

// Add debug logging for findById
suitSchema.post('findOne', function (doc) {
  console.log(`findOne result: ${doc ? doc._id : 'null'}`);
});

suitSchema.post('findOneAndUpdate', function (doc) {
  console.log(`findOneAndUpdate result: ${doc ? doc._id : 'null'}`);
});

module.exports = mongoose.model('Suit', suitSchema);