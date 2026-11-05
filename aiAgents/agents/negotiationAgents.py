import os
import json
from google import genai
from google.genai import types
from schemas.paymentSchema import NegotiationRequest, NegotiationResponse, NegotiationRound

def run_dual_agent_negotiation(req: NegotiationRequest) -> NegotiationResponse:
    deal_possible = req.owner_max_budget >= req.worker_min_rate

    # Calculate mathematically fair Nash bargaining midpoint when deal is possible
    fair_deal_amount = (
        round((req.owner_max_budget + req.worker_min_rate) / 2.0, 2)
        if deal_possible
        else None
    )

    api_key = os.getenv("GEMINI_API_KEY", "")
    use_gemini = bool(api_key and "your_" not in api_key)

    if use_gemini:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"""
You are orchestrating a 3-round autonomous negotiation between two AI agents on a Freelance Escrow platform:
1. "Owner Agent": Represents the project owner ({req.owner_email}).
   - Initial Offer: {req.owner_initial_offer} {req.currency}
   - Secret Maximum Budget: {req.owner_max_budget} {req.currency}
2. "Worker Agent": Represents the freelancer ({req.worker_paypal_email}).
   - Initial Ask: {req.worker_initial_ask} {req.currency}
   - Secret Minimum Floor Rate: {req.worker_min_rate} {req.currency}
3. "Consensus Arbitrator Agent": Finalizes the contract in Round 3.

Project Title: {req.project_title}
Project Scope: {req.project_scope}
Deal Mathematically Possible: {deal_possible}
Target Final Agreed Amount (if deal_possible is True): {fair_deal_amount} {req.currency}

Generate a realistic, technical negotiation transcript (5 turns total: Round 1 Owner, Round 1 Worker, Round 2 Owner, Round 2 Worker, Round 3 Consensus Arbitrator Agent) referencing specific deliverables from the Project Scope and PayPal Escrow milestone protection.
"""
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=NegotiationResponse,
                    temperature=0.4,
                ),
            )
            parsed = json.loads(response.text)
            # Enforce exact mathematical guardrails on top of LLM dialogue
            parsed["deal_cracked"] = deal_possible
            parsed["agreed_amount"] = fair_deal_amount
            parsed["currency"] = req.currency
            parsed["ai_powered"] = True
            return NegotiationResponse(**parsed)
        except Exception as e:
            print(f"[Gemini Fallback Triggered]: {e}")

    # Deterministic Multi-Agent Fallback (if no API key or offline)
    r1_offer = round(req.owner_initial_offer, 2)
    r1_ask = round(req.worker_initial_ask, 2)
    target = fair_deal_amount if deal_possible else r1_offer
    r2_offer = round((r1_offer + target) / 2.0, 2)
    r2_ask = round((r1_ask + (fair_deal_amount or r1_ask)) / 2.0, 2)

    transcript = [
        NegotiationRound(
            round=1,
            speaker="Owner Agent",
            proposal=r1_offer,
            message=f"Opening bid at {r1_offer} {req.currency} for '{req.project_title}'. Funds will be locked in PayPal Escrow upon OTP verification.",
        ),
        NegotiationRound(
            round=1,
            speaker="Worker Agent",
            proposal=r1_ask,
            message=f"Evaluating scope ({req.project_scope[:65]}...). Given full-stack complexity and testing requirements, our initial ask is {r1_ask} {req.currency}.",
        ),
        NegotiationRound(
            round=2,
            speaker="Owner Agent",
            proposal=r2_offer,
            message=f"We can raise our offer to {r2_offer} {req.currency} if production deployment and clean documentation are included.",
        ),
        NegotiationRound(
            round=2,
            speaker="Worker Agent",
            proposal=r2_ask,
            message=f"Because payment is guaranteed via PayPal Escrow hold, we can adjust our rate down to {r2_ask} {req.currency}.",
        ),
        NegotiationRound(
            round=3,
            speaker="Consensus Arbitrator Agent",
            proposal=fair_deal_amount,
            message=(
                f"DEAL CRACKED at {fair_deal_amount} {req.currency}! Both agents reached Nash equilibrium. Triggering 6-digit Owner OTP for PayPal Escrow deposit."
                if deal_possible
                else f"NEGOTIATION FAILED: Owner max cap ({req.owner_max_budget} {req.currency}) is below Worker minimum rate ({req.worker_min_rate} {req.currency})."
            ),
        ),
    ]

    return NegotiationResponse(
        deal_cracked=deal_possible,
        agreed_amount=fair_deal_amount,
        currency=req.currency,
        ai_powered=False,
        transcript=transcript,
    )