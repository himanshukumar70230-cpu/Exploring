def evaluate_transaction_risk(amount: float, recipient_email: str, note: str) -> dict:
    risk_score = 10.0
    reasons = []

    if amount > 10000:
        risk_score += 75.0
        reasons.append("High-value transfer exceeds $10,000 automated threshold")
    elif amount > 3000:
        risk_score += 25.0
        reasons.append("Elevated transfer value ($3,000+)")

    suspicious_keywords = ["crypto", "gambling", "offshore", "urgent_bypass"]
    if any(k in (note or "").lower() for k in suspicious_keywords):
        risk_score += 50.0
        reasons.append("Flagged keyword in transaction note")

    if not recipient_email or "@" not in recipient_email:
        risk_score += 40.0
        reasons.append("Invalid recipient email format")

    risk_score = min(round(risk_score, 2), 100.0)
    approved = risk_score < 50.0
    status = "CLEARED" if approved else "FLAGGED_HIGH_RISK"

    return {
        "approved": approved,
        "risk_score": risk_score,
        "status": status,
        "reasons": reasons or ["Standard freelance velocity and AML checks passed"],
    }