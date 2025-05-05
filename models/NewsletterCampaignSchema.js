const mongoose = require('mongoose');

const newsletterCampaignSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'failed'],
    default: 'draft'
  },
  sentAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  recipientCount: {
    type: Number,
    default: 0
  }
}, { collection: 'newsletterCampaigns' });

module.exports = mongoose.model('NewsletterCampaign', newsletterCampaignSchema);