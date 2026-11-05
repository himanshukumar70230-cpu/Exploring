const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const paymentRoutes = require('./routes/paymentRoutes');
const agentRoutes = require('./routes/agentRoutes');
const escrowRoutes = require('./routes/escrowRoutes'); // <-- 1. Must be imported
const { authMiddleware } = require('./middleware/authMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));
app.use(authMiddleware);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'paypal-ai-backend',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/escrow', escrowRoutes); // <-- 2. Must be mounted here

app.use(errorMiddleware);

module.exports = app;