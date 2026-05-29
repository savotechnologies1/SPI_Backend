// const express = require("express");
// const connectDB = require("./config/dbConnection");
// const cors = require("cors");
// const path = require("path");
// require("dotenv").config();
// const bodyParser = require("body-parser");
// const prisma = require("./config/prisma");
// const app = express();
// const port = process.env.PORT || 8080;

// connectDB();
// app.use(cors());
// app.use(bodyParser.urlencoded({ extended: true }));
// // app.use(express.json({ limit: "30mb" }));
// app.use(express.json({
//   limit: "30mb",
//   verify: (req, res, buf) => {
//     if (req.originalUrl.startsWith("/api/admin/webhooks/stripe")) {
//       req.rawBody = buf;
//     }
//   }
// }));
// // --- MODIFIED 
// app.use(express.urlencoded({ extended: true, limit: "30mb" }));
// require("./functions/cronJobs");
// app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// app.use("/api/admin", require("./routes/adminRoutes"));
// app.use("/api/shopFloor", require("./routes/shopFloorRoutes"));
// app.use("/api/frontLine", require("./routes/frontLineRoutes"));

// app.listen(port, () => {
//   console.log(` Server running on port ${port}`);
// });

// process.on("SIGINT", async () => {
//   console.log("SIGINT received. Disconnecting Prisma...");
//   await prisma.$disconnect();
//   process.exit(0);
// });


const express = require("express");
const connectDB = require("./config/dbConnection");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const prisma = require("./config/prisma");
const paymentController = require("./controllers/paymentController"); // <-- 1. Import controller

const app = express();
const port = process.env.PORT || 8080;

connectDB();
app.use(cors());

// 🛑 2. STRIPE WEBHOOK ROUTE (Sabse pehle, express.json se upar)
// Ye route direct index.js mein likhein taaki global parser isse touch na kare
app.post(
  "/api/admin/webhooks/stripe", 
  express.raw({ type: "application/json" }), 
  paymentController.handleStripeWebhook
);
app.post(
  "/webhooks/paypal", 
  express.json(), // PayPal ke liye standard JSON parser chalta hai
  paymentController.handlePaypalWebhook
);
// 3. BAAKI MIDDLEWARES (Ab aap express.json use kar sakte hain)
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

require("./functions/cronJobs");
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// Routes
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/shopFloor", require("./routes/shopFloorRoutes"));
app.use("/api/frontLine", require("./routes/frontLineRoutes"));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Disconnecting Prisma...");
  await prisma.$disconnect();
  process.exit(0);
});