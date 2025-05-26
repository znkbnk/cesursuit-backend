const express = require("express");
const router = express.Router();
const Suit = require("../models/Suit");
const multer = require("multer");
const { verifyAuth, verifyAdmin } = require("../middleware/auth");
const sanitizeHtml = require("sanitize-html");
const sharp = require("sharp");
const {
  cache,
  MAX_CACHE_SIZE,
  CACHE_DURATION,
  invalidateCache,
} = require("../utils/cache"); // Import shared cache

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(
      file.originalname.toLowerCase().split(".").pop()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Images only (jpeg, jpg, png, webp)!"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// GET suits with filters, sorting, pagination, and caching
router.get("/", async (req, res) => {
  try {
    const {
      fit,
      style,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 9,
    } = req.query;

    // Create cache key and check cache
    const cacheKey = `suits:${JSON.stringify({
      fit,
      style,
      minPrice,
      maxPrice,
      sort,
      page,
      limit,
    })}`;

    // Check if result is in cache and not expired
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`Cache hit for ${cacheKey}`);
        return res.json(cached.data);
      }
      cache.delete(cacheKey); // Remove expired entry
    }

    // Convert and validate pagination parameters
    const pageNum = Math.max(1, parseInt(page)) || 1;
    const limitNum = Math.min(parseInt(limit) || 9, 1000);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};
    if (fit && fit !== "all") query.fit = fit;
    if (style) query.style = style;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Only apply sorting if limit is low or sort is explicitly requested
    let sortOption = null;
    if (limitNum <= 100 && sort) {
      if (sort === "price-asc") sortOption = { price: 1 };
      else if (sort === "price-desc") sortOption = { price: -1 };
      else if (sort === "name-asc") sortOption = { name: 1 };
    }

    // Execute query
    const suitsQuery = Suit.find(query).allowDiskUse(true);
    if (sortOption) {
      suitsQuery.sort(sortOption);
    }

    const [total, suits] = await Promise.all([
      Suit.countDocuments(query),
      suitsQuery.skip(skip).limit(limitNum).lean(),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response = {
      suits,
      totalPages,
      currentPage: pageNum,
    };

    if (pageNum > totalPages && totalPages > 0) {
      response.suits = [];
    }

    // Store in cache if under size limit
    if (cache.size < MAX_CACHE_SIZE) {
      cache.set(cacheKey, {
        data: response,
        timestamp: Date.now(),
      });
    }

    res.json(response);
  } catch (error) {
    console.error("Error fetching suits:", {
      error: error.message,
      stack: error.stack,
      query: req.query,
      timestamp: new Date().toISOString(),
    });
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
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

// POST create new suit (admin only)
router.post(
  "/",
  verifyAuth,
  verifyAdmin,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "secondaryImages", maxCount: 3 },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        sku,
        price,
        fit,
        style,
        description,
        stock,
        sizeInventory,
        isComingSoon,
      } = req.body;

      // Sanitize user inputs
      const sanitizedName = sanitizeHtml(name, {
        allowedTags: [],
        allowedAttributes: {},
      });
      const sanitizedSku = sanitizeHtml(sku, {
        allowedTags: [],
        allowedAttributes: {},
      });
      const sanitizedFit = sanitizeHtml(fit, {
        allowedTags: [],
        allowedAttributes: {},
      });
      const sanitizedStyle = sanitizeHtml(style, {
        allowedTags: [],
        allowedAttributes: {},
      });
      const sanitizedDescription = sanitizeHtml(description, {
        allowedTags: ["p", "br", "strong", "em"],
        allowedAttributes: {},
      });

      // Basic validation
      if (
        !sanitizedName ||
        !sanitizedSku ||
        !sanitizedFit ||
        !sanitizedStyle ||
        !sanitizedDescription
      ) {
        return res
          .status(400)
          .json({
            message: "All required fields must be provided after sanitization",
          });
      }

      // Check if SKU is unique
      const existingSuit = await Suit.findOne({ sku: sanitizedSku });
      if (existingSuit) {
        return res.status(400).json({ message: "SKU must be unique" });
      }

      // Validate mainImage
      if (!req.files || !req.files.mainImage || !req.files.mainImage[0]) {
        return res.status(400).json({ message: "Main image is required" });
      }

      // Validate and process main image with sharp
      const mainImageFile = req.files.mainImage[0];
      const isValidMainImage = await sharp(mainImageFile.buffer)
        .metadata()
        .then(() => true)
        .catch(() => false);
      if (!isValidMainImage) {
        return res.status(400).json({ message: "Invalid main image file" });
      }

      // Resize main image to 800px width
      const resizedMainImage = await sharp(mainImageFile.buffer)
        .resize({ width: 800, fit: "contain" })
        .toBuffer();

      // Validate and process secondary images
      let secondaryImages = [];
      if (req.files.secondaryImages) {
        for (const file of req.files.secondaryImages) {
          const isValidSecondaryImage = await sharp(file.buffer)
            .metadata()
            .then(() => true)
            .catch(() => false);
          if (!isValidSecondaryImage) {
            return res
              .status(400)
              .json({ message: "Invalid secondary image file" });
          }
          const resizedSecondaryImage = await sharp(file.buffer)
            .resize({ width: 800, fit: "contain" })
            .toBuffer();
          secondaryImages.push(
            `data:${file.mimetype};base64,${resizedSecondaryImage.toString(
              "base64"
            )}`
          );
        }
      }

      const isComingSoonBool = isComingSoon === "true" || isComingSoon === true;

      // Validate price and stock for non-Coming Soon products
      if (!isComingSoonBool) {
        if (!price || isNaN(price) || Number(price) <= 0) {
          return res.status(400).json({ message: "Valid price is required" });
        }
        const parsedStock = parseInt(stock) || 0;
        if (parsedStock <= 0 && style !== "Accessories") {
          return res.status(400).json({
            message: "Total stock must be greater than 0 for non-Accessories",
          });
        }

        // Parse and validate sizeInventory
        let parsedSizeInventory = [];
        if (sizeInventory) {
          try {
            parsedSizeInventory = JSON.parse(sizeInventory);
            if (!Array.isArray(parsedSizeInventory)) {
              return res
                .status(400)
                .json({ message: "sizeInventory must be an array" });
            }
          } catch (error) {
            return res
              .status(400)
              .json({ message: "Invalid sizeInventory format" });
          }
        }

        // Validate sizeInventory entries and total stock
        if (parsedSizeInventory.length > 0) {
          const totalSizeQuantity = parsedSizeInventory.reduce(
            (sum, item) => sum + (item.quantity || 0),
            0
          );
          if (totalSizeQuantity !== parsedStock) {
            return res.status(400).json({
              message:
                "Total stock must equal the sum of size inventory quantities",
            });
          }
          for (const item of parsedSizeInventory) {
            if (
              !item.size ||
              item.quantity === undefined ||
              item.quantity < 0
            ) {
              return res.status(400).json({
                message:
                  "Each sizeInventory entry must have a valid size and non-negative quantity",
              });
            }
          }
        } else if (style !== "Accessories" && parsedStock > 0) {
          return res.status(400).json({
            message:
              "Size inventory is required when stock is greater than 0 for non-Accessories",
          });
        }
      } else {
        if (stock && parseInt(stock) !== 0) {
          return res
            .status(400)
            .json({ message: "Coming Soon products must have 0 stock" });
        }
        if (sizeInventory && JSON.parse(sizeInventory).length > 0) {
          return res.status(400).json({
            message: "Coming Soon products cannot have size inventory",
          });
        }
      }

      const mainImageBase64 = `data:${
        mainImageFile.mimetype
      };base64,${resizedMainImage.toString("base64")}`;

      const suit = new Suit({
        name: sanitizedName,
        sku: sanitizedSku,
        price: isComingSoonBool ? null : parseFloat(price),
        fit: sanitizedFit,
        style: sanitizedStyle,
        description: sanitizedDescription,
        stock: isComingSoonBool ? 0 : parseInt(stock) || 0,
        image: mainImageBase64,
        images: secondaryImages,
        sizeInventory: isComingSoonBool ? [] : JSON.parse(sizeInventory) || [],
        isComingSoon: isComingSoonBool,
      });

      await suit.save();

      // Invalidate cache after creating new suit
      invalidateCache();

      res.status(201).json({ message: "Product added successfully", suit });
    } catch (error) {
      console.error("Error adding product:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// PATCH update suit sizeInventory and stock (admin only)
router.patch("/:id", verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const { sizeInventory, stock, price, isComingSoon } = req.body;

    if (sizeInventory && !Array.isArray(sizeInventory)) {
      return res
        .status(400)
        .json({ message: "sizeInventory must be an array" });
    }

    const isComingSoonBool = isComingSoon === "true" || isComingSoon === true;

    if (!isComingSoonBool) {
      if (
        price === undefined ||
        price === null ||
        isNaN(price) ||
        Number(price) <= 0
      ) {
        return res
          .status(400)
          .json({ message: "Valid price is required for active products" });
      }

      if (sizeInventory) {
        for (const item of sizeInventory) {
          if (!item.size || item.quantity === undefined || item.quantity < 0) {
            return res
              .status(400)
              .json({ message: "Invalid sizeInventory entry" });
          }
        }

        const totalSizeQuantity = sizeInventory.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        if (stock !== totalSizeQuantity) {
          return res.status(400).json({
            message:
              "Total stock must equal the sum of size inventory quantities",
          });
        }
      }
    } else {
      if (stock && parseInt(stock) !== 0) {
        return res
          .status(400)
          .json({ message: "Coming Soon products must have 0 stock" });
      }
      if (sizeInventory && sizeInventory.length > 0) {
        return res
          .status(400)
          .json({ message: "Coming Soon products cannot have size inventory" });
      }
    }

    const suit = await Suit.findById(req.params.id);
    if (!suit) {
      return res.status(404).json({ message: "Suit not found" });
    }

    suit.sizeInventory = isComingSoonBool
      ? []
      : sizeInventory || suit.sizeInventory;
    suit.stock = isComingSoonBool
      ? 0
      : stock !== undefined
      ? stock
      : suit.stock;
    suit.price = isComingSoonBool ? null : parseFloat(price);
    suit.isComingSoon = isComingSoonBool;

    await suit.save({ runValidators: true });

    // Invalidate cache after updating suit
    invalidateCache();

    res.status(200).json({ message: "Suit updated successfully", suit });
  } catch (error) {
    console.error("Error updating suit:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE a suit (admin only)
router.delete("/:id", verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const suit = await Suit.findById(req.params.id);
    if (!suit) {
      return res.status(404).json({ message: "Suit not found" });
    }

    await Suit.deleteOne({ _id: req.params.id });

    // Invalidate cache after deleting suit
    invalidateCache();

    res.status(200).json({ message: "Suit deleted successfully" });
  } catch (error) {
    console.error("Error deleting suit:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
