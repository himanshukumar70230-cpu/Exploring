const PaymentService = require('../services/paymentService');

const AgentController = {
  async analyzePaymentIntent(req, res, next) {
    try {
      const { recipient_email, 
      amount, source_currency, 
      target_currency, note } = req.body;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid positive amount is required for AI simulation',
        });
      }

      const aiDecision = await PaymentService.runAgentOrchestration({
        recipient_email: recipient_email || 'recipient@sandbox.paypal.com',
        amount: Number(amount),
        source_currency: source_currency || 'USD',
        target_currency: target_currency || 'EUR',
        note: note || '',
      });

      return res.status(200).json({
        success: true,
        data: aiDecision,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AgentController;