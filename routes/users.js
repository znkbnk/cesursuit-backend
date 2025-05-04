const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();

// Initialize Firebase Admin if not already
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

// Firestore DB reference with safe settings
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// GET pending users
router.get("/pending", async (req, res) => {
  try {
    const querySnapshot = await db.collection("pendingUsers").get();
    const users = [];

    for (const docSnap of querySnapshot.docs) {
      const userData = { id: docSnap.id, ...docSnap.data() };
      try {
        await admin.auth().getUser(userData.uid);
        users.push(userData);
      } catch (error) {
        if (error.code === "auth/user-not-found") {
          await docSnap.ref.delete();
        }
      }
    }

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST approve user
router.post("/approve/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, displayName, createdAt } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Missing required field: email" });
    }

    // Enable user in Firebase Auth
    await admin.auth().updateUser(uid, { disabled: false });

    // Create user document in "users" collection (triggers email function)
    await db.collection("users").doc(uid).set({
      uid,
      email,
      displayName: displayName || "",
      status: "approved",
      approvedAt: new Date().toISOString(),
      createdAt: createdAt || new Date().toISOString(),
    });

    // Delete from "pendingUsers"
    await db.collection("pendingUsers").doc(uid).delete();

    res.status(200).json({ message: "User approved and moved to users collection" });
  } catch (error) {
    console.error("Approval error:", error);
    res.status(500).json({ message: "Approval failed", error: error.message });
  }
});

// DELETE reject user
router.delete("/reject/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    // Delete from Firebase Auth
    await admin.auth().deleteUser(uid);

    // Optional: delete from Firestore if exists
    await db.collection("pendingUsers").doc(uid).delete().catch(() => {});
    await db.collection("users").doc(uid).delete().catch(() => {});

    res.status(200).json({ message: "User rejected and deleted" });
  } catch (err) {
    res.status(500).json({ message: "Rejection failed", error: err.message });
  }
});

module.exports = router;
