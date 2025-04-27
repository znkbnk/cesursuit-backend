// Updated routes/suits.js
const express = require("express");
const router = express.Router();
const Suit = require("../models/Suit");

// GET suits with filters, sorting, and pagination
router.get("/", async (req, res) => {
  try {
    const {
      fabric,
      style,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 9,
    } = req.query;

    // Build query
    const query = {};
    if (fabric) query.fabric = { $regex: fabric, $options: "i" };
    if (style) query.style = style;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sorting
    let sortOption = {};
    if (sort === "price-asc") sortOption.price = 1;
    else if (sort === "price-desc") sortOption.price = -1;
    else if (sort === "name-asc") sortOption.name = 1;

    // Pagination
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
    res.status(500).json({ message: "Server error" });
  }
});

// GET single suit by ID
router.get("/:id", async (req, res) => {
  try {
    console.log(`Fetching suit with ID: ${req.params.id}`);
    const suit = await Suit.findById(req.params.id);
    if (!suit) {
      console.log(`Suit not found for ID: ${req.params.id}`);
      return res.status(404).json({ message: "Suit not found" });
    }
    console.log(`Found suit: ${suit.name}`);
    res.json(suit);
  } catch (error) {
    console.error(`Error fetching suit ID ${req.params.id}:`, error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;