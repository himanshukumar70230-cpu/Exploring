const { PAYPAL_BASE_URL, generateAccessToken } = require('../config/paypal');

const PayPalService = {
  async createOrder({ amount, currency = 'USD', description = 'AI Verified Payment' }) {
    const accessToken = await generateAccessToken();

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          description,
          amount: {
            currency_code: currency.toUpperCase(),
            value: Number(amount).toFixed(2),
          },
        },
      ],
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`PayPal Create Order Error: ${JSON.stringify(data)}`);
    }
    return data;
  },

  async captureOrder(orderId) {
    const accessToken = await generateAccessToken();

    const response = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`PayPal Capture Order Error: ${JSON.stringify(data)}`);
    }
    return data;
  },

  async getOrderDetails(orderId) {
    const accessToken = await generateAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`PayPal Get Order Error: ${JSON.stringify(data)}`);
    }
    return data;
  },
};

module.exports = PayPalService;