from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from schemas.paymentSchema import (
    NegotiationRequest,
    NegotiationResponse,
    AnalyzePaymentRequest,
    AnalyzePaymentResponse,
)
from orchestrator.agentOrchestrator import AgentOrchestrator

load_dotenv()

app = FastAPI(
    title="PayPal AI Multi-Agent Service",
    description="Autonomous Owner vs. Worker Escrow Negotiation & Compliance Pipeline",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "paypal-ai-agents"}

@app.post("/negotiate", response_model=NegotiationResponse)
async def negotiate_contract(payload: NegotiationRequest):
    return await AgentOrchestrator.handle_negotiation(payload)

@app.post("/analyze", response_model=AnalyzePaymentResponse)
async def analyze_payment(payload: AnalyzePaymentRequest):
    return await AgentOrchestrator.handle_payment_analysis(payload)