

const express = require("express");
const connectDB = require("./config/dbConnection");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const prisma = require("./config/prisma");
const paymentController = require("./controllers/paymentController"); 

const app = express();
const port = process.env.PORT || 8080;

connectDB();
app.use(cors());
app.post(
  "/api/admin/webhooks/stripe", 
  express.raw({ type: "application/json" }), 
  paymentController.handleStripeWebhook
);
app.post(
  "/webhooks/paypal", 
  express.json(), 
  paymentController.handlePaypalWebhook
);
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
require("./functions/cronJobs");
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
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