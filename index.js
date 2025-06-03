const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const { connectDb } = require("./config/dbConnection");

const app = express();
const port = process.env.PORT || 3000;

// Connect to Database
connectDb().catch((err) => {
  console.error("Failed to connect to DB:", err);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

// Static Files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/user", require("./routes/userRoutes"));

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

