const express = require('express');
const router = express.Router();
const EscrowService = require('../services/escrowService');
const { requireRole } = require('../middleware/authMiddleware');
const db = require('../config/db');

// 1. Start Owner vs Worker AI Negotiation
router.post('/negotiate', async (req, res, next) => {
  try {
    const data = await EscrowService.negotiateAndCreateContract(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 2. Verify Owner OTP & Generate PayPal Escrow Order
router.post('/:contractId/verify-otp',requireRole('OWNER'), async (req, res, next) => {
  try {
    const { otp } = req.body;
    const data = await EscrowService.verifyOtpAndCreateEscrowOrder(req.params.contractId, otp);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 3. Capture Owner Payment (Locks funds in Platform PayPal Account)
router.post('/:contractId/fund-escrow',requireRole('OWNER'), async (req, res, next) => {
  try {
    const data = await EscrowService.captureIntoEscrow(req.params.contractId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 4. Worker Submits Work
router.post('/:contractId/submit-work',requireRole('WORKER'), async (req, res, next) => {
  try {
    const { deliverable_url } = req.body;
    const data = await EscrowService.submitWork(req.params.contractId, deliverable_url);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 5. Owner Approves Work -> Triggers PayPal Payouts API to Worker
router.post('/:contractId/release-funds',requireRole('OWNER'), async (req, res, next) => {
  try {
    const data = await EscrowService.approveWorkAndReleasePayout(req.params.contractId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 6. List All Contracts for Dashboard
router.get('/contracts', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM escrow_contracts ORDER BY created_at DESC');
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;