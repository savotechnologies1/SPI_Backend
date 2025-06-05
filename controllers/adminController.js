const md5 = require("md5");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const login = async (req, res) => {
  let connection;

  try {
    const { userName, password } = req.body;

    connection = await db.getConnection(); // ✅ get connection from pool

    const [data] = await connection.query(
      `SELECT * FROM admin 
       WHERE (email = ? OR phoneNumber = ?) 
       AND password = ? 
       AND (isDeleted IS NULL OR isDeleted = FALSE)`, // optional condition
      [userName.trim().toLowerCase(), userName.trim(), md5(password)]
    );

    if (data.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = data[0];

    const token = jwt.sign(
      {
        id: user.id,
        roles: user.roles,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "5d" }
    );

    await connection.query(
      `UPDATE admin
       SET tokens = JSON_ARRAY_APPEND(COALESCE(tokens, JSON_ARRAY()), '$', ?) 
       WHERE id = ?`,
      [token, user.id]
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (connection) await connection.release();
  }
};

module.exports = { login };