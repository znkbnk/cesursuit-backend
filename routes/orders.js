const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Suit = require("../models/Suit");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const pdfkit = require("pdfkit");
const mongoose = require("mongoose");
const { verifyAuth, verifyAdmin } = require("../middleware/auth");


// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST create new order
router.post("/", verifyAuth, async (req, res) => {
  const session = await mongoose.startSession();
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
    const userDoc = await admin.firestore().collection("pendingUsers").doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const order = new Order({
      user: {
        uid: userId,
        email: userRecord.email,
        displayName: userRecord.displayName,
        companyName: userData.companyName || "",
        mobileNumber: userData.mobileNumber || "",
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

// GET picking list PDF (admin only)
router.get("/:orderId/picking-list", verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("items.suit")
      .exec();
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const doc = new pdfkit();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=picking_list_${order._id}.pdf`);
    doc.pipe(res);

    doc.fontSize(16).text(`Picking List - Order ${order._id}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Customer: ${order.user.email}`);
    doc.text(`Company: ${order.user.companyName || "N/A"}`);
    doc.text(`Ordered At: ${new Date(order.createdAt).toLocaleString()}`);
    doc.moveDown();

    doc.text("Items:", { underline: true });
    order.items.forEach((item, index) => {
      doc.text(
        `${index + 1}. ${item.suit.name} (Style: ${item.suit.style}, Size: ${item.size}, Quantity: ${item.quantity})`
      );
    });

    doc.end();
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PATCH approve order (admin only)
router.patch("/:orderId/approve", verifyAuth, verifyAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("items.suit")
      .exec();
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== "pending") {
      return res.status(400).json({ message: "Order is not in pending status" });
    }

    order.status = "confirmed";
    await order.save();

    // Send approval email
    await transporter.sendMail({
      from: `"Suit Store" <${process.env.EMAIL_USER}>`,
      to: order.user.email,
      subject: "Your Order Has Been Approved",
      html: `
        <h2>Order Confirmation</h2>
        <p>Dear ${order.user.displayName || "Customer"},</p>
        <p>Your order (ID: ${order._id}) has been approved and is now being processed.</p>
        <h3>Order Details:</h3>
        <ul>
          ${order.items
            .map(
              (item) =>
                `<li>${item.suit.name} (Size: ${item.size}, Quantity: ${item.quantity})</li>`
            )
            .join("")}
        </ul>
        <p>Total: £${order.items
          .reduce((sum, item) => sum + item.suit.price * item.quantity, 0)
          .toFixed(2)}</p>
        <p>Thank you for shopping with us!</p>
      `,
    });

    res.status(200).json({ message: "Order approved successfully", order });
  } catch (error) {
    console.error("Order approval error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE reject order (admin only)
router.delete("/:orderId/reject", verifyAuth, verifyAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const order = await Order.findById(req.params.orderId)
      .populate("items.suit")
      .session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== "pending") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Order is not in pending status" });
    }

    // Restore stock
    for (const item of order.items) {
      const suit = await Suit.findById(item.suit).session(session);
      if (!suit) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: `Suit ${item.suit} not found` });
      }
      const sizeInventoryItem = suit.sizeInventory.find(
        (si) => si.size === item.size
      );
      if (sizeInventoryItem) {
        sizeInventoryItem.quantity += item.quantity;
      }
      suit.stock = suit.sizeInventory.reduce(
        (sum, si) => sum + si.quantity,
        0
      );
      await suit.save({ session });
    }

    // Store user email and order details before deletion
    const userEmail = order.user.email;
    const userDisplayName = order.user.displayName || "Customer";
    const orderDetails = order.items.map(
      (item) =>
        `${item.suit.name} (Size: ${item.size}, Quantity: ${item.quantity})`
    );
    const orderId = order._id;

    // Delete order
    await Order.deleteOne({ _id: req.params.orderId }).session(session);

    await session.commitTransaction();

    // Send rejection email
    try {
      await transporter.sendMail({
        from: `"Suit Store" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: "Your Order Has Been Rejected",
        html: `
          <h2>Order Rejection Notification</h2>
          <p>Dear ${userDisplayName},</p>
          <p>We regret to inform you that your order (ID: ${orderId}) has been rejected.</p>
          <h3>Order Details:</h3>
          <ul>
            ${orderDetails.map((detail) => `<li>${detail}</li>`).join("")}
          </ul>
          <p>Please contact us if you have any questions.</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
    }

    res.status(200).json({ message: "Order rejected and stock restored" });
  } catch (error) {
    await session.abortTransaction();
    console.error("Order rejection error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;