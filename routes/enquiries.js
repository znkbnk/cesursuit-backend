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

module.exports = router;