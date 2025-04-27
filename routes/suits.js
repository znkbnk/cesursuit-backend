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

router.get("/:id", async (req, res) => {
  try {
    console.log(`Querying Suit with _id: ${req.params.id}`);
    const objectId = new mongoose.Types.ObjectId(req.params.id);
    const suit = await Suit.findOne({ _id: objectId }); // Use findOne with explicit ObjectId
    if (!suit) {
      console.log(`No suit found for _id: ${req.params.id}`);
      const allSuits = await Suit.find({}).select('_id');
      console.log(`All suit IDs in database: ${JSON.stringify(allSuits)}`);
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