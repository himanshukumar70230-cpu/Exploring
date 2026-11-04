require('dotenv').config();

const PAYPAL_BASE_URL =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

// In-memory cache for OAuth2 token to avoid hitting rate limits
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Generates (or returns a valid cached) PayPal OAuth 2.0 Access Token
 */
const generateAccessToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'MISSING_PAYPAL_API_CREDENTIALS: Ensure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are set in your .env file'
    );
  }

  // Return cached token if it is still valid (with a 60-second safety buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal OAuth2 Token Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // data.expires_in is in seconds; convert to milliseconds
  tokenExpiresAt = Date.now() + (data.expires_in || 32400) * 1000;

  return cachedToken;
};

/**
 * Reusable helper for authenticated PayPal REST API calls
 * Supports Orders v2 (/v2/checkout/orders) & Payouts v1 (/v1/payments/payouts)
 */
const paypalRequest = async (endpoint, { method = 'GET', body = null, headers = {} } = {}) => {
  const accessToken = await generateAccessToken();

  const response = await fetch(`${PAYPAL_BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `PayPal API Error [${method} ${endpoint}] (${response.status}): ${JSON.stringify(data)}`
    );
  }

  return data;
};

module.exports = {
  PAYPAL_BASE_URL,
  generateAccessToken,
  paypalRequest,
};