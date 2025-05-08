const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Suit = require("../models/Suit");
const admin = require("firebase-admin");

// Middleware to verify user authentication
const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Auth verification error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};

// Middleware to verify admin
const verifyAdmin = async (req, res, next) => {
  try {
    const user = await admin.auth().getUser(req.user.uid);
    const isAdmin = user.customClaims?.admin && user.email === "zenikibeniki@gmail.com";
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch (error) {
    console.error("Admin verification error:", error);
    res.status(403).json({ message: "Admin access required" });
  }
};

// POST create new order
router.post("/", verifyAuth, async (req, res) => {
  const session = await Suit.startSession();
  session.startTransaction();

  try {
    const { userId, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Items are required" });
    }

    // Validate stock and prepare updates
    const suitUpdates = [];
    for (const item of items) {
      const suit = await Suit.findById(item.suitId).session(session);
      if (!suit) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: `Suit ${item.suitId} not found` });
      }

      const sizeInventoryItem = suit.sizeInventory.find(
        (si) => si.size === item.size
      );
      if (!sizeInventoryItem || sizeInventoryItem.quantity < item.quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message: `Insufficient stock for ${suit.name} size ${item.size}`,
        });
      }

      // Update sizeInventory
      sizeInventoryItem.quantity -= item.quantity;
      suit.stock = suit.sizeInventory.reduce(
        (sum, si) => sum + si.quantity,
        0
      );
      suitUpdates.push(suit);
    }

    // Save stock updates
    for (const suit of suitUpdates) {
      await suit.save({ session });
    }

    // Create order
    const userRecord = await admin.auth().getUser(userId);
    const order = new Order({
      user: {
        uid: userId,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
      items: items.map((item) => ({
        suit: item.suitId,
        size: item.size,
        quantity: item.quantity,
      })),
    });

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate("items.suit")
      .exec();

    res.status(201).json({ message: "Order created successfully", order: populatedOrder });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Order creation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET all orders (admin only)
router.get("/", verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.suit")
      .sort({ createdAt: -1 })
      .exec();
    res.status(200).json(orders);
  } catch (error) {
    console.error("Fetch orders error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;