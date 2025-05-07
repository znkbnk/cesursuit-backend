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
router.post("/", upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "secondaryImages", maxCount: 3 }
]), async (req, res) => {
  try {
    const { name, price, fabric, style, description, stock, sizeInventory } = req.body;

    // Basic validation
    if (!name || !price || !fabric || !style || !description || !stock) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Validate mainImage
    if (!req.files || !req.files.mainImage || !req.files.mainImage[0]) {
      return res.status(400).json({ message: "Main image is required" });
    }

    const parsedStock = parseInt(stock);
    if (parsedStock <= 0 && style !== "Accessories") {
      return res.status(400).json({ message: "Total stock must be greater than 0 for non-Accessories" });
    }

    // Parse sizeInventory if provided
    let parsedSizeInventory = [];
    if (sizeInventory) {
      try {
        parsedSizeInventory = JSON.parse(sizeInventory);
        if (!Array.isArray(parsedSizeInventory)) {
          return res.status(400).json({ message: "sizeInventory must be an array" });
        }
      } catch (error) {
        return res.status(400).json({ message: "Invalid sizeInventory format" });
      }
    }

    // Validate sizeInventory entries and total stock
    if (parsedSizeInventory.length > 0) {
      const totalSizeQuantity = parsedSizeInventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
      if (totalSizeQuantity !== parsedStock) {
        return res.status(400).json({ message: "Total stock must equal the sum of size inventory quantities" });
      }
      for (const item of parsedSizeInventory) {
        if (!item.size || item.quantity === undefined || item.quantity < 0) {
          return res.status(400).json({ message: "Each sizeInventory entry must have a valid size and non-negative quantity" });
        }
      }
    } else if (style !== "Accessories" && parsedStock > 0) {
      return res.status(400).json({ message: "Size inventory is required when stock is greater than 0 for non-Accessories" });
    }

    // Convert main image to base64
    const mainImageFile = req.files.mainImage[0];
    const mainImageBase64 = `data:${mainImageFile.mimetype};base64,${mainImageFile.buffer.toString('base64')}`;

    // Convert secondary images to base64 (if provided)
    const secondaryImages = req.files.secondaryImages
      ? req.files.secondaryImages.map(file => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`)
      : [];

    console.log("Main Image Base64 (first 100 chars):", mainImageBase64.substring(0, 100));
    console.log("Secondary Images Count:", secondaryImages.length);

    const suit = new Suit({
      name,
      price: parseFloat(price),
      fabric,
      style,
      description,
      stock: parsedStock,
      image: mainImageBase64,
      images: secondaryImages,
      sizeInventory: parsedSizeInventory,
    });

    await suit.save();
    res.status(201).json({ message: "Product added successfully", suit });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;