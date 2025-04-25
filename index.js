const express = require("express");
const connectDB = require("./config/dbConnection");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const bodyParser = require("body-parser");

connectDB();
const app = express();
app.use(cors());

const port = process.env.PORT;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({ limit: "30mb" }));

app.use(express.urlencoded({ extended: true, limit: "30mb" }));

const directory = path.join(__dirname, "public");

app.use(express.static(directory));

app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/user", require("./routes/userRoutes"));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
