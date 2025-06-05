const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const connectDb = require('./config/dbConnection');
const adminRoutes = require('./routes/adminRoutes')
require('dotenv').config();
const PORT = process.env.PORT || 8080;

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Initialize DB setup and then start server
(async () => {
  await connectDb(); // DB setup and default admin

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
})();
