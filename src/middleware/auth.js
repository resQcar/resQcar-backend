const { auth } = require("../config/firebase");

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = header.split(" ")[1];

    const decoded = await auth.verifyIdToken(token);

    req.user = decoded; // now req.user.uid available

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};