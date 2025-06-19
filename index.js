const express = require("express");
const connectDB = require("./config/dbConnection");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const bodyParser = require("body-parser");
const prisma = require("./config/prisma");
const app = express();
const port = process.env.PORT || 8080;

connectDB();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

const directory = path.join(__dirname, "public");
app.use(express.static(directory));

app.use("/api/admin", require("./routes/adminRoutes"));

app.listen(port, () => {
  console.log(` Server running on port ${port}`);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Disconnecting Prisma...");
  await prisma.$disconnect();
  process.exit(0);
});
