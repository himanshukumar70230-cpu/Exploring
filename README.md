
paypalAiPayment/
│
├── client/                              # React + Vite Frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── navbar.jsx
│   │   │   ├── paymentForm.jsx
│   │   │   ├── currencySelector.jsx
│   │   │   ├── agentStatus.jsx
│   │   │   └── transactionStatus.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── home.jsx
│   │   │   ├── dashboard.jsx
│   │   │   └── payment.jsx
│   │   │
│   │   ├── services/
│   │   │   └── paymentApi.js
│   │   │
│   │   ├── app.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── server/                              # Node.js + Express Backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   └── paypal.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── paymentController.js
│   │   │   └── agentController.js
│   │   │
│   │   ├── routes/
│   │   │   ├── paymentRoutes.js
│   │   │   └── agentRoutes.js
│   │   │
│   │   ├── models/
│   │   │   ├── user.js
│   │   │   └── transaction.js
│   │   │
│   │   ├── services/
│   │   │   ├── paypalService.js
│   │   │   ├── currencyService.js
│   │   │   └── paymentService.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── errorMiddleware.js
│   │   │
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── package.json
│   └── .env
│
├── agents/                              # Python AI Agents
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── paymentAgent.py
│   │   ├── currencyAgent.py
│   │   ├── complianceAgent.py
│   │   └── transactionAgent.py
│   │
│   ├── orchestrator/
│   │   ├── __init__.py
│   │   └── agentOrchestrator.py
│   │
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── paypalTool.py
│   │   ├── exchangeRateTool.py
│   │   └── riskAnalysisTool.py
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── paymentSchema.py
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   └── logger.py
│   │
│   ├── main.py
│   ├── requirements.txt
│   └── .env
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── workflow.md
│
├── .gitignore
└── README.md
