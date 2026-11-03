const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const paymentRoutes = require('./routes/paymentRoutes');
const agentRoutes = require('./routes/agentRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// Global Middleware
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

// Health Check Endpoint
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

// Central Error Handler
app.use(errorMiddleware);

module.exports = app;