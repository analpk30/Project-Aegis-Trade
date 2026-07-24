def compute_guardian_score(
    size_eur: float,
    asset_class: str,
    venue: str,
    kyc_status: str,
    aml_risk_level: str,
    suitability_category: str,
    gdpr_consent: bool,
    precrime_similarity_score: float = 0.0
) -> dict:
    # Coerce numeric inputs — externalized JSON seed data can arrive as strings.
    try:
        size_eur = float(size_eur)
    except (TypeError, ValueError):
        size_eur = 0.0
    try:
        precrime_similarity_score = float(precrime_similarity_score)
    except (TypeError, ValueError):
        precrime_similarity_score = 0.0

    # 1. Executability & Liquidity Score (0 - 100)
    executability = 100
    if size_eur > 40_000_000:
        executability -= 25
    elif size_eur > 20_000_000:
        executability -= 10

    if 'OTC' in venue or 'Off-Book' in venue:
        executability -= 15

    # 2. Violation Risk & AML Penalty (0 - 100)
    violation_risk = 100
    if precrime_similarity_score > 0.7:
        violation_risk -= 45
    elif precrime_similarity_score > 0.4:
        violation_risk -= 20

    if aml_risk_level == 'CRITICAL':
        violation_risk -= 40
    elif aml_risk_level == 'HIGH':
        violation_risk -= 20
    elif aml_risk_level == 'MEDIUM':
        violation_risk -= 10

    if kyc_status == 'EXPIRED':
        violation_risk -= 35
    elif kyc_status == 'PENDING':
        violation_risk -= 25

    # 3. GDPR Consent & Suitability Score (0 - 100)
    consent = 100 if gdpr_consent else 10
    if suitability_category == 'RETAIL' and size_eur > 1_000_000:
        consent -= 50

    # 4. Regulatory Capital Efficiency Score (0 - 100)
    capital = 90
    if asset_class in ['Rates', 'Credit'] and size_eur > 30_000_000:
        capital = 75

    executability = max(0, min(100, executability))
    violation_risk = max(0, min(100, violation_risk))
    consent = max(0, min(100, consent))
    capital = max(0, min(100, capital))

    # Weighted composite score
    composite = round(
        (executability * 0.25) +
        (violation_risk * 0.40) +
        (consent * 0.20) +
        (capital * 0.15)
    )

    return {
        'score': composite,
        'breakdown': {
            'executabilityScore': executability,
            'violationRiskScore': violation_risk,
            'consentScore': consent,
            'regulatoryCapitalImpact': capital
        }
    }
