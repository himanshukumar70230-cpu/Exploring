The system runs on a microservices-inspired architecture combining a high-performance Node.js/Express backend, an autonomous Python/FastAPI AI Agent service, a PostgreSQL ledger, and PayPal REST APIs (Orders v2 / Payouts v1).

Plaintext
┌─────────────────┐       HTTP JSON       ┌──────────────────────┐
│  React Frontend │ ───────────────────►  │ Node.js/Express API  │
│  (Vite + Tailwind)                      │  (Port 5000)         │
└─────────────────┘                       └───┬──────────────┬───┘
                                              │              │
                                    PostgreSQL│              │ HTTP JSON
                                      (Docker)│              ▼
                                              │     ┌──────────────────┐
                                              │     │ FastAPI AI Agent │
                                              │     │  (Port 8000)     │
                                              │     └────────┬─────────┘
                                              │              │ Google Gemini
                                              ▼              ▼
                                      ┌──────────────────────────────┐
                                      │     PayPal Sandbox APIs      │
                                      │  (Orders v2 & Payouts v1)    │
                                      └──────────────────────────────┘
⚙️ Tech Stack
Backend: Node.js, Express.js, REST APIs, JWT, RBAC Middleware

AI Multi-Agent Service: Python, FastAPI, Pydantic, Google Gemini (google-genai), Httpx

Database: PostgreSQL (Docker container, JSONB audit logs)

Payment Gateway: PayPal REST SDK (Orders v2 Checkout & Payouts v1 Batch Transfer)

Frontend: React, Vite, Axios

🔄 How It Works (The 5-Stage Escrow Lifecycle)
Stage 1: Autonomous Dual-Agent Negotiation (POST /api/escrow/negotiate)
The Owner Agent and Worker Agent engage in a multi-round negotiation evaluating project scope, initial offers, and secret budget floors.

A Consensus Arbitrator Agent (powered by Google Gemini with deterministic Nash-equilibrium fallback) cracks the deal and generates an agreed amount.

The system automatically generates a 6-digit secure OTP for the project owner and stores the pending contract in PostgreSQL (status: DEAL_CRACKED).

Stage 2: OTP Verification & PayPal Order Creation (POST /api/escrow/:id/verify-otp)
The project owner inputs their 6-digit OTP.

Upon verification, the backend calls the PayPal Orders v2 API to initialize a secure escrow deposit order and returns the HATEOAS approve link.

Stage 3: Funding Escrow into Platform Holding (POST /api/escrow/:id/fund-escrow)
Once the owner approves the payment (via browser or dev bypass), the backend calls the PayPal Capture API to lock the funds safely inside the platform merchant escrow account (status: ESCROW_FUNDED).

Stage 4: Deliverable Submission (POST /api/escrow/:id/submit-work)
Protected by strict Role-Based Access Control (RBAC), the freelancer submits their GitHub/Vercel deliverable URL (status: WORK_SUBMITTED).

Stage 5: Work Approval & Automated Payout (POST /api/escrow/:id/release-funds)
The project owner reviews the work and triggers fund release.

The backend calls the PayPal Payouts v1 API (/v1/payments/payouts) to instantly disburse funds from the platform escrow account directly to the worker's PayPal email (status: RELEASED_TO_WORKER).

🛠️ Installation & Local Setup
1. Clone the Repository & Start PostgreSQL
Bash
git clone https://github.com/your-username/paypal-ai-escrow.git
cd paypal-ai-escrow

# Start PostgreSQL in Docker
docker compose up -d
2. Configure Environment Variables
Create a .env file in your root/backend folder:

Code snippet
PORT=5000
NODE_ENV=development
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=paypal_ai_db
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
AGENT_SERVICE_URL=http://localhost:8000
GEMINI_API_KEY=your_gemini_api_key
3. Run the Backend Server
Bash
npm install
npm run dev
4. Run the Python AI Agent Service
Bash
cd agents
python -m venv venv
# Windows Git Bash: source venv/Scripts/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000