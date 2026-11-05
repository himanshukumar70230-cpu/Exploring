PORT=5000
NODE_ENV=development

# PostgreSQL Configuration (Use 127.0.0.1 on Windows to avoid IPv6 ECONNREFUSED)
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=paypal_ai_db

# PayPal Sandbox Credentials ([https://developer.paypal.com](https://developer.paypal.com))
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret

# Python Multi-Agent Service URL (Falls back to internal logic if offline)
AGENT_SERVICE_URL=http://localhost:8000

# Security & Frontend CORS
JWT_SECRET=super_secret_paypal_hackathon_key_2026
CLIENT_URL=http://localhost:5173

Dependecy
"axios": "^1.21.0",
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.6",
    "dotenv": "^18.0.9",
    "express": "^5.3.0",
    "helmet": "^8.3.0",
    "jsonwebtoken": "^9.0.3",
    "morgan": "^1.12.1",
    "pg": "^8.23.1",
    "uuid": "^14.0.3",
    "zod": "^4.6.7"