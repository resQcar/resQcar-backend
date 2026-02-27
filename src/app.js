const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const paymentRoutes = require('./routes/payment.routes');
app.use('/api/payments', paymentRoutes);

app.get('/', (req, res) => {
    res.send('resQcar Backend is running!');
});

module.exports = app;