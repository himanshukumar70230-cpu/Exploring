const express = require('express');
const router = express.Router();
const AgentController = require('../controllers/agentController');

// POST /api/agents/analyze -> Dry-run AI agent pipeline (FX + Compliance + Risk Score)
router.post('/analyze', AgentController.analyzePaymentIntent);

module.exports = router;