const express = require("express");
const router = express.Router();
const Suit = require("../models/Suit");
const multer = require("multer");

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Images only (jpeg, jpg, png, webp)!"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

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
    const suit = await Suit.findById(req.params.id);
    if (!suit) {
      return res.status(404).json({ message: "Suit not found" });
    }
    res.json(suit);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST create new suit
router.post(
  "/",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "secondaryImages", maxCount: 3 },
  ]),
  async (req, res) => {
    try {
      const { name, price, fabric, style, description, stock, sizes } = req.body;

      // Validate required fields
      if (!name || !price || !fabric || !style || !description || !stock || !req.files.mainImage) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // Parse sizes
      const sizesArray = Array.isArray(sizes) ? sizes : JSON.parse(sizes);

      // Validate sizes
      const validSizes = ["S", "M", "L", "XL"];
      if (!sizesArray.every((size) => validSizes.includes(size))) {
        return res.status(400).json({ message: "Invalid size provided" });
      }

      // Convert main image to Base64
      const mainImageBase64 = req.files.mainImage[0].buffer.toString("base64");
      const mainImageMimeType = req.files.mainImage[0].mimetype;
      const mainImageDataUrl = `data:${mainImageMimeType};base64,${mainImageBase64}`;

      // Convert secondary images to Base64
      const secondaryImageDataUrls = req.files.secondaryImages
        ? req.files.secondaryImages.map((file) => {
            const base64 = file.buffer.toString("base64");
            const mimeType = file.mimetype;
            return `data:${mimeType};base64,${base64}`;
          })
        : [];

      // Create new suit
      const suit = new Suit({
        name,
        price: Number(price),
        fabric,
        style,
        description,
        stock: Number(stock),
        image: mainImageDataUrl,
        images: secondaryImageDataUrls,
        sizes: sizesArray,
      });

      await suit.save();
      res.status(201).json({ message: "Product added successfully", suit });
    } catch (error) {
      console.error("Product creation error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

module.exports = router;