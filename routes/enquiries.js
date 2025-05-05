// New routes/enquiries.js
const express = require("express");
const router = express.Router();
const Enquiry = require("../models/Enquiry");

// POST new enquiry
router.post("/", async (req, res) => {
  try {
    const { suitId, name, email, phone, message } = req.body;
    const enquiry = new Enquiry({
      suitId,
      name,
      email,
      phone,
      message,
    });
    await enquiry.save();
    res.status(201).json({ message: "Enquiry submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/newsletter", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if email already exists
    const existingSubscriber = await Newsletter.findOne({ email });
    if (existingSubscriber) {
      return res.status(400).json({ message: "This email is already subscribed" });
    }

    const subscriber = new Newsletter({ email });
    await subscriber.save();
    res.status(201).json({ message: "Subscribed successfully" });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: "This email is already subscribed" });
    } else {
      res.status(500).json({ message: "Server error" });
    }
  }
});

module.exports = router;