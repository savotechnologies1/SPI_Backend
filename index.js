// const express = require("express");
// const cors = require("cors");
// const path = require("path");
// require("dotenv").config();
// const connection = require("./config/dbConnection");

// const app = express();
// const port = process.env.PORT || 3000;

// // Connect to Database
// // connection().catch((err) => {
// //   console.error("❌ Failed to connect to DB:", err.message);
// //   process.exit(1);
// // });

// // Middleware
// app.use(cors());
// app.use(express.json({ limit: "30mb" })); 
// app.use(express.urlencoded({ extended: true, limit: "30mb" }));

// // Static Files
// app.use(express.static(path.join(__dirname, "public")));

// // Routes
// app.use("/api/admin", require("./routes/adminRoutes"));
// // app.use("/api/user", require("./routes/userRoutes"));

// // Start Server
// app.listen(port, () => {
//   console.log(`🚀 Server running on port ${port}`);
// });


const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { connectDb } = require("./config/dbConnection");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/admin", require("./routes/adminRoutes"));


// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  await connectDb(); // ensures table + default data
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});