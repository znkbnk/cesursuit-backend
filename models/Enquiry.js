const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  suitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Suit', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Enquiry', enquirySchema);

