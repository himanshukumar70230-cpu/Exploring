from schemas.paymentSchema import (
    NegotiationRequest,
    NegotiationResponse,
    AnalyzePaymentRequest,
    AnalyzePaymentResponse,
)
from agents.negotiationAgents import run_dual_agent_negotiation
from tools.exchangeRateTool import fetch_exchange_rate
from tools.riskAnalysisTool import evaluate_transaction_risk

class AgentOrchestrator:
    @staticmethod
    async def handle_negotiation(req: NegotiationRequest) -> NegotiationResponse:
        return run_dual_agent_negotiation(req)

    @staticmethod
    async def handle_payment_analysis(req: AnalyzePaymentRequest) -> AnalyzePaymentResponse:
        rate = await fetch_exchange_rate(req.source_currency, req.target_currency)
        converted = round(req.amount * rate, 2)
        risk = evaluate_transaction_risk(req.amount, req.recipient_email, req.note)

        trace = {
            "currencyAgent": f"Locked rate 1 {req.source_currency} = {rate} {req.target_currency} (Converted: {converted} {req.target_currency})",
            "complianceAgent": f"Risk Score {risk['risk_score']}/100 ({risk['status']}) — {'; '.join(risk['reasons'])}",
            "paymentAgent": (
                "Authorized for PayPal Orders v2 Escrow/Checkout creation"
                if risk["approved"]
                else "BLOCKED: Payment rejected prior to PayPal gateway call"
            ),
            "transactionAgent": "Immutable JSONB audit trace prepared for PostgreSQL ledger",
        }

        return AnalyzePaymentResponse(
            approved_by_ai=risk["approved"],
            risk_score=risk["risk_score"],
            compliance_status=risk["status"],
            exchange_rate=rate,
            converted_amount=converted,
            recommended_currency=req.target_currency,
            agent_trace=trace,
        )