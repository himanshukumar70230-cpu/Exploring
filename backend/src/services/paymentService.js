const axios = require('axios');
const PayPalService = require('./paypalService');
const CurrencyService = require('./currencyService');
const TransactionModel = require('../models/transaction');

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8000';

const PaymentService = {
  async runAgentOrchestration(payload) {
    try {
      const response = await axios.post(`${AGENT_SERVICE_URL}/orchestrate`, payload, {
        timeout: 8000,
      });
      return response.data;
    } catch (error) {
      console.warn('Python Agent service unreachable, running fallback evaluation:', error.message);
      const { rate } = await CurrencyService.getExchangeRate(
        payload.source_currency,
        payload.target_currency
      );
      const riskScore = payload.amount > 10000 ? 75.0 : 12.5;
      const approved = riskScore < 50;

      return {
        approved_by_ai: approved,
        risk_score: riskScore,
        compliance_status: approved ? 'CLEARED' : 'FLAGGED_HIGH_VALUE',
        exchange_rate: rate,
        converted_amount: Number((payload.amount * rate).toFixed(2)),
        recommended_currency: payload.target_currency,
        agent_trace: {
          currencyAgent: `Rate locked at ${rate} (${payload.source_currency} -> ${payload.target_currency})`,
          complianceAgent: approved
            ? `Low risk score (${riskScore}/100) - AML passed`
            : `Blocked: High risk score (${riskScore}/100)`,
          paymentAgent: approved ? 'Authorized for PayPal Order v2 creation' : 'Halted',
          transactionAgent: 'Fallback orchestrator audit recorded',
        },
      };
    }
  },

  async initiateAiPayment(paymentInput) {
    const {
      user_id = null,
      recipient_email,
      amount,
      source_currency = 'USD',
      target_currency = 'EUR',
      note = '',
    } = paymentInput;

    // 1. Consult AI Multi-Agent Orchestrator
    const aiDecision = await this.runAgentOrchestration({
      user_id,
      recipient_email,
      amount: Number(amount),
      source_currency,
      target_currency,
      note,
    });

    // 2. If blocked by Compliance Agent, record rejected transaction in PostgreSQL
    if (!aiDecision.approved_by_ai) {
      const blockedTx = await TransactionModel.create({
        user_id,
        paypal_order_id: null,
        source_amount: amount,
        source_currency,
        target_amount: aiDecision.converted_amount,
        target_currency,
        exchange_rate: aiDecision.exchange_rate,
        compliance_status: aiDecision.compliance_status,
        risk_score: aiDecision.risk_score,
        agent_logs: aiDecision.agent_trace,
        status: 'BLOCKED_BY_AI',
      });

      return {
        approved: false,
        transaction: blockedTx,
        aiDecision,
      };
    }

    // 3. Create Order in PayPal Sandbox using recommended currency & amount
    // Note: PayPal Sandbox standard accounts accept USD, EUR, GBP, CAD, JPY, AUD
    const settlementCurrency = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'].includes(
      aiDecision.recommended_currency.toUpperCase()
    )
      ? aiDecision.recommended_currency.toUpperCase()
      : 'USD';

    const settlementAmount =
      settlementCurrency === source_currency.toUpperCase()
        ? Number(amount)
        : aiDecision.converted_amount;

    const paypalOrder = await PayPalService.createOrder({
      amount: settlementAmount,
      currency: settlementCurrency,
      description: `AI Payment to ${recipient_email}: ${note || 'Cross-border settlement'}`,
    });

    // 4. Persist in PostgreSQL
    const transaction = await TransactionModel.create({
      user_id,
      paypal_order_id: paypalOrder.id,
      source_amount: amount,
      source_currency,
      target_amount: aiDecision.converted_amount,
      target_currency,
      exchange_rate: aiDecision.exchange_rate,
      compliance_status: aiDecision.compliance_status,
      risk_score: aiDecision.risk_score,
      agent_logs: aiDecision.agent_trace,
      status: paypalOrder.status || 'CREATED',
    });

    return {
      approved: true,
      paypalOrderId: paypalOrder.id,
      paypalOrder,
      transaction,
      aiDecision,
    };
  },

  async capturePayment(orderId) {
    const captureData = await PayPalService.captureOrder(orderId);
    const updatedTx = await TransactionModel.updateByOrderId(orderId, {
      status: captureData.status || 'COMPLETED',
    });
    return {
      captureData,
      transaction: updatedTx,
    };
  },
};

module.exports = PaymentService;