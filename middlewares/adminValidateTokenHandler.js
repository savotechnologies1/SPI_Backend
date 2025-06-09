const jwt = require("jsonwebtoken");
const db = require("../config/db");

const adminValidateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authorization header missing or improperly formatted",
    });
  }

  const token = authHeader.split(" ")[1];
  let connection;

  try {
    connection = await db.getConnection();

    // Check if token exists in the admin's token list
    const [rows] = await connection.query(
      `SELECT * FROM admin WHERE JSON_CONTAINS(tokens, JSON_QUOTE(?)) AND isDeleted = FALSE`,
      [token]
    );

    
    if (rows.length === 0) {
      return res.status(401).json({
        message: "Token expired or invalid. Please re-login.",
      });
    }

    // Validate token
 jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
  if (err) {
    console.error("JWT verification failed:", err.message);
    return res.status(401).json({ message: "User is not authorized" });
  }

  req.user = decoded.user || decoded;


  next();
});

  } catch (error) {
    console.error("Token validation error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = adminValidateToken;



