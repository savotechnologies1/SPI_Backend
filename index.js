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
console.log("database", process.env.DATABASE_URL);
const allowedOrigins = ["https://spi.server24.in"];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // if you need to allow cookies or authorization headers
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
require("./functions/cronJobs"); // Path को सही करें यदि आपकी cronJobs.js फ़ाइल किसी और directory में है।
// app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
// app.use(
//   "./public",
//   express.static(path.join(__dirname, "public"), {
//     setHeaders: function (res, path, stat) {
//       // If the file is an mp4, explicitly set the Content-Type
//       if (path.endsWith(".mp4")) {
//         res.set("Content-Type", "video/mp4");
//       }
//     },
//   })
// );
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/shopFloor", require("./routes/shopFloorRoutes"));
app.use("/api/frontLine", require("./routes/frontLineRoutes"));

app.listen(port, () => {
  console.log(` Server running on port ${port}`);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Disconnecting Prisma...");
  await prisma.$disconnect();
  process.exit(0);
});
