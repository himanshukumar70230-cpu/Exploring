from pydantic import BaseModel, Field
from typing import List, Optional, Dict

# ==========================================
# 1. Dual-Agent Escrow Negotiation Schemas
# ==========================================
class NegotiationRequest(BaseModel):
    project_title: str
    project_scope: str
    owner_email: str
    worker_paypal_email: str
    owner_initial_offer: float
    owner_max_budget: float
    worker_initial_ask: float
    worker_min_rate: float
    currency: str = "USD"

class NegotiationRound(BaseModel):
    round: int
    speaker: str
    proposal: Optional[float] = None
    message: str

class NegotiationResponse(BaseModel):
    deal_cracked: bool
    agreed_amount: Optional[float] = None
    currency: str = "USD"
    ai_powered: bool = True
    transcript: List[NegotiationRound]

# ==========================================
# 2. Cross-Border Payment & Risk Schemas
# ==========================================
class AnalyzePaymentRequest(BaseModel):
    recipient_email: str
    amount: float
    source_currency: str = "USD"
    target_currency: str = "EUR"
    note: Optional[str] = "Freelance Milestone"

class AnalyzePaymentResponse(BaseModel):
    approved_by_ai: bool
    risk_score: float
    compliance_status: str
    exchange_rate: float
    converted_amount: float
    recommended_currency: str
    agent_trace: Dict[str, str]