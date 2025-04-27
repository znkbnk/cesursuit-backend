// routes/suits.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Suit = require("../models/Suit");

router.get("/", async (req, res) => {
  try {
    const { fabric, style, minPrice, maxPrice, sort, page = 1, limit = 9 } = req.query;
    const query = {};
    if (fabric) query.fabric = { $regex: fabric, $options: "i" };
    if (style) query.style = style;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    let sortOption = {};
    if (sort === "price-asc") sortOption.price = 1;
    else if (sort === "price-desc") sortOption.price = -1;
    else if (sort === "name-asc") sortOption.name = 1;

    const skip = (page - 1) * limit;
    const suits = await Suit.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Suit.countDocuments(query);

    res.json({
      suits,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error("Error in GET /api/suits:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// routes/suits.js
router.get("/:id", async (req, res) => {
  try {
    console.log('Received ID:', req.params.id);
    console.log('Is valid ObjectId?', mongoose.Types.ObjectId.isValid(req.params.id));
    
    // Try both findById and findOne
    const suitById = await Suit.findById(req.params.id);
    const suitFindOne = await Suit.findOne({ _id: req.params.id });
    
    console.log('findById result:', suitById);
    console.log('findOne result:', suitFindOne);
    
    if (!suitFindOne) {
      console.log('No suit found with either method');
      return res.status(404).json({ 
        message: "Suit not found",
        receivedId: req.params.id,
        isValidObjectId: mongoose.Types.ObjectId.isValid(req.params.id)
      });
    }
    
    res.json(suitFindOne);
  } catch (error) {
    console.error('Full error:', error);
    res.status(500).json({ 
      message: "Server error",
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;