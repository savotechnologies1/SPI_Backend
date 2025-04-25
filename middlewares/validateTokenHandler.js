const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const validateToken = async (req, res, next) => {
  let token;
  let authHeader = req.headers.Authorization || req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer")) {
    token = authHeader.split(" ")[1];
    const userData = await User.countDocuments({
      tokens: { $elemMatch: { $eq: token } },isDeleted:false
    });
    if (userData) {
      jwt.verify(token, process.env.ACCESS_TOKEN_SECERT, (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: "User is not authorized" });
        }
        req.user = decoded.user;
        next();
      });
    } else {
      return res.status(400).json({ message: "Token expired please re-login ." });
    }
  } else {
    return res
      .status(401)
      .json({ message: "User is not authorized or token is missing" });
  }
};

module.exports = validateToken;

