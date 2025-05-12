const admin = require("firebase-admin");

// Middleware to verify user authentication
const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Please Login" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Auth verification error:", error);
    res.status(401).json({ message: "Please Login" });
  }
};

// Middleware to verify admin
const verifyAdmin = async (req, res, next) => {
  try {
    const user = await admin.auth().getUser(req.user.uid);
    const isAdmin =
      user.customClaims?.admin &&
      ["zenikibeniki@gmail.com", "cesurgroupuk@gmail.com"].includes(user.email);
    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch (error) {
    console.error("Admin verification error:", error);
    res.status(403).json({ message: "Admin access required" });
  }
};

module.exports = { verifyAuth, verifyAdmin };