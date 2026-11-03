const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');

// POST /api/payments/create-order -> Runs AI agents + creates PayPal Order v2 + saves to DB
router.post('/create-order', PaymentController.createAiOrder);

// POST /api/payments/capture-order/:orderId -> Captures approved PayPal order + updates DB
router.post('/capture-order/:orderId', PaymentController.captureOrder);

// GET /api/payments/transactions -> Returns all transactions for AG Grid dashboard
router.get('/transactions', PaymentController.getTransactions);

// GET /api/payments/rates?from=USD&to=EUR -> Live currency rate preview
router.get('/rates', PaymentController.getExchangeRate);

module.exports = router;