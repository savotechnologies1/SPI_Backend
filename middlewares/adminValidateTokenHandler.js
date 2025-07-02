const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const adminValidateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authorization header missing or improperly formatted",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const admin = await prisma.admin.findFirst({
      where: {
        tokens: {
          array_contains: token,
        },
        isDeleted: false,
      },
    });

    if (!admin) {
      return res.status(401).json({
        message: "Token expired or invalid. Please re-login.",
      });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "User is not authorized" });
      }
      req.user = decoded.user || decoded;
      next();
    });
  } catch (error) {
    console.error("Error in token validation middleware:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = adminValidateToken;
