const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const connectDb = require('./config/dbConnection');
const adminRoutes = require('./routes/adminRoutes')

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());
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
