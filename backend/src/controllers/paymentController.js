const PaymentService = require('../services/paymentService');
const CurrencyService = require('../services/currencyService');
const TransactionModel = require('../models/transaction');

const PaymentController = {
  async createAiOrder(req, res, next) {
    try {
      const { recipient_email, 
        amount, source_currency, 
        target_currency,
        note,
        user_id } =req.body;

      if (!recipient_email || !amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'recipient_email and a valid positive amount are required',
        });
      }

      const result = await PaymentService.initiateAiPayment({
        user_id,
        recipient_email,
        amount: Number(amount),
        source_currency: source_currency || 'USD',
        target_currency: target_currency || 'EUR',
        note,
      });

      if (!result.approved) {
        return res.status(422).json({
          success: false,
          message: 'Transaction blocked by AI Compliance Agent',
          data: result,
        });
      }

      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async captureOrder(req, res, next) {
    try {
      const { orderId } = req.params;
      if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID is required' });
      }

      const result = await PaymentService.capturePayment(orderId);
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async getTransactions(req, res, next) {
    try {
      const transactions = await TransactionModel.findAll();
      return res.status(200).json({
        success: true,
        count: transactions.length,
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  },

  async getExchangeRate(req, res, next) {
    try {
      const { from = 'USD', to = 'EUR' } = req.query;
      const rateInfo = await CurrencyService.getExchangeRate(from, to);
      return res.status(200).json({
        success: true,
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        ...rateInfo,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = PaymentController;