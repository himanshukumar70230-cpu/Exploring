const axios = require('axios');

const FALLBACK_RATES = {
  USD: { EUR: 0.92, GBP: 0.79, INR: 84.1, JPY: 152.3, CAD: 1.38, USD: 1.0 },
  EUR: { USD: 1.09, GBP: 0.86, INR: 91.4, JPY: 165.5, CAD: 1.5, EUR: 1.0 },
  GBP: { USD: 1.27, EUR: 1.16, INR: 106.3, JPY: 192.8, CAD: 1.75, GBP: 1.0 },
};

const CurrencyService = {
  async getExchangeRate(sourceCurrency = 'USD', targetCurrency = 'EUR') {
    const src = sourceCurrency.toUpperCase();
    const tgt = targetCurrency.toUpperCase();

    if (src === tgt) {
      return { rate: 1.0, provider: 'DIRECT' };
    }

    try {
      const response = await axios.get(`https://open.er-api.com/v6/latest/${src}`, {
        timeout: 3000,
      });
      if (response.data && response.data.rates && response.data.rates[tgt]) {
        return {
          rate: Number(response.data.rates[tgt].toFixed(6)),
          provider: 'OPEN_EXCHANGE_API',
        };
      }
    } catch (err) {
      console.warn(`Live FX lookup failed, using fallback rate: ${err.message}`);
    }

    const fallbackRate = FALLBACK_RATES[src]?.[tgt] || 1.0;
    return { rate: fallbackRate, provider: 'FALLBACK_MATRIX' };
  },
};

module.exports = CurrencyService;