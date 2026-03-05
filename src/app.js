require('dotenv').config();

const express = require('express');
const cors = require('cors');

require('./config/firebase');

const towTruckRoutes = require('./routes/tow-trucks.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/tow-trucks', towTruckRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
