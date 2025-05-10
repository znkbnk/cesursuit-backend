const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();
const PDFDocument = require("pdfkit");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

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

router.get("/approved", async (req, res) => {
  try {
    const querySnapshot = await db.collection("users").where("status", "==", "approved").get();
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

router.get("/report", async (req, res) => {
  try {
    const querySnapshot = await db.collection("users").where("status", "==", "approved").get();
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

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=approved_users_report.pdf");
    doc.pipe(res);

    doc.fontSize(20).text("Approved Users Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(12);
    users.forEach((user, index) => {
      doc.text(`User ${index + 1}:`);
      doc.text(`Email: ${user.email || "N/A"}`);
      doc.text(`Company Name: ${user.companyName || "N/A"}`);
      doc.text(`Mobile Number: ${user.mobileNumber || "N/A"}`);
      doc.text(`Display Name: ${user.displayName || "N/A"}`);
      doc.text(`Approved At: ${new Date(user.approvedAt).toLocaleDateString()}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Failed to generate report", error: err.message });
  }
});

router.post("/approve/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, displayName, createdAt, companyName, mobileNumber } = req.body;

    if (!email || !companyName) {
      return res.status(400).json({ message: "Missing required fields: email and companyName" });
    }

    await admin.auth().updateUser(uid, { disabled: false });

    await db.collection("users").doc(uid).set({
      uid,
      email,
      displayName: displayName || "",
      companyName: companyName || "",
      mobileNumber: mobileNumber || "",
      status: "approved",
      approvedAt: new Date().toISOString(),
      createdAt: createdAt || new Date().toISOString(),
    });

    await db.collection("pendingUsers").doc(uid).delete();

    res.status(200).json({ message: "User approved and moved to users collection" });
  } catch (error) {
    console.error("Approval error:", error);
    res.status(500).json({ message: "Approval failed", error: error.message });
  }
});

router.delete("/reject/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const pendingUserDoc = await db.collection("pendingUsers").doc(uid).get();
    let email, displayName;
    if (pendingUserDoc.exists) {
      const userData = pendingUserDoc.data();
      email = userData.email;
      displayName = userData.displayName || "User";
    } else {
      const approvedUserDoc = await db.collection("users").doc(uid).get();
      if (!approvedUserDoc.exists) {
        return res.status(404).json({ message: "User not found" });
      }
      const userData = approvedUserDoc.data();
      email = userData.email;
      displayName = userData.displayName || "User";
    }

    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `Cesur Suits <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Cesur Suits Account Registration Status",
      html: `
        <h2>Dear ${displayName},</h2>
        <p>We regret to inform you that your account with Cesur Suits has been terminated.</p>
        <p>If you have any questions or believe this was an error, please contact our support team.</p>
        <p>Best regards,<br/>The Cesur Suits Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Termination email sent to ${email}`);

    await admin.auth().deleteUser(uid);

    await db.collection("pendingUsers").doc(uid).delete().catch(() => {});
    await db.collection("users").doc(uid).delete().catch(() => {});

    res.status(200).json({ message: "User rejected, deleted, and notified" });
  } catch (err) {
    console.error("Rejection error:", err);
    res.status(500).json({ message: "Rejection failed", error: err.message });
  }
});

module.exports = router;