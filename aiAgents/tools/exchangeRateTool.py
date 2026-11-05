import httpx

FALLBACK_RATES = {
    ("USD", "EUR"): 0.92,
    ("USD", "GBP"): 0.79,
    ("USD", "INR"): 84.10,
    ("EUR", "USD"): 1.09,
    ("GBP", "USD"): 1.27,
}

async def fetch_exchange_rate(source: str, target: str) -> float:
    src = source.upper()
    tgt = target.upper()
    if src == tgt:
        return 1.0

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"https://open.er-api.com/v6/latest/{src}")
            if resp.status_code == 200:
                data = resp.json()
                rate = data.get("rates", {}).get(tgt)
                if rate:
                    return round(float(rate), 4)
    except Exception:
        pass

    return FALLBACK_RATES.get((src, tgt), 1.0)