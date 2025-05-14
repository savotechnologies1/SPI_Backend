const jwt = require("jsonwebtoken");
const { pool } = require("../config/dbConnection");

const adminValidateToken = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
    let connection;
    try {
      connection = await pool.getConnection();

      const [rows] = await connection.query(
        `SELECT * FROM admins WHERE JSON_CONTAINS(tokens, JSON_QUOTE(?)) AND isDeleted = FALSE`,
        [token]
      );

      if (rows.length > 0) {
        jwt.verify(token,process.env.ACCESS_TOKEN_SECERT, (err, decoded) => {
          if (err) {
            console.error("JWT verification failed:", err.message);
            return res.status(401).json({ message: "User is not authorized" });
          }

          req.user = decoded.user;
          console.log("Authenticated admin:", decoded.user
          );
          next();
        });
      } else {
        return res
          .status(401)
          .json({ message: "Token expired or invalid. Please re-login." });
      }
    } catch (error) {
      console.error("Token validation error:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    } finally {
      if (connection) connection.release();
    }
  } else {
    return res
      .status(401)
      .json({ message: "Authorization header missing or improperly formatted" });
  }
};

module.exports = adminValidateToken;
