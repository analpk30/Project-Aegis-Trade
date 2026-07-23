import math

def cosine_similarity(a: list, b: list) -> float:
    if len(a) != len(b) or len(a) == 0:
        return 0.0
    dot_product = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

SEEDED_FINE_CASES = [
    {
        'id': 'CASE-2015-LIBOR',
        'caseName': 'LIBOR Benchmark Manipulation (2015)',
        'caseYear': 2015,
        'category': 'Benchmark & Rate Fixing',
        'regulator': 'BaFin / FCA',
        'fineAmount': '€450 Million',
        'description': 'Traders colluded via chat rooms to submit artificial benchmark rates influencing EURIBOR/LIBOR fixings.',
        'keyPattern': 'Off-market quotes submitted near fix window + trader comms referencing benchmark offsets.',
        'mitigationStrategy': 'Halt automated execution on rate fixings; trigger 1st Line Compliance review immediately.',
        'vector': [0.85, 0.92, 0.88, 0.95, 0.10, 0.40, 0.20, 0.80],
    },
    {
        'id': 'CASE-2018-MBS',
        'caseName': 'MBS Mismarking & Illiquid Asset Valuation (2018)',
        'caseYear': 2018,
        'category': 'Valuation & Mismarking',
        'regulator': 'SEC / BaFin',
        'fineAmount': '€180 Million',
        'description': 'Structured credit desk overvalued subprime mortgage-backed securities to disguise inventory losses.',
        'keyPattern': 'High size transactions in illiquid credit instruments executed >150bps off fair value mark.',
        'mitigationStrategy': 'Mandate independent risk controller price verification before booking trade.',
        'vector': [0.90, 0.85, 0.95, 0.30, 0.15, 0.90, 0.10, 0.20],
    },
    {
        'id': 'CASE-2021-AML',
        'caseName': 'Cross-Border Wealth AML Structural Failure (2021)',
        'caseYear': 2021,
        'category': 'AML & Customer Due Diligence',
        'regulator': 'BaFin',
        'fineAmount': '€320 Million',
        'description': 'Unvetted offshore holding companies routed €100M+ FX swaps without verified ultimate beneficial owners.',
        'keyPattern': 'High volume FX/Rates orders routed for clients with EXPIRED or PENDING KYC status.',
        'mitigationStrategy': 'Block order flow instantly until UBO documentation and GwG compliance clearance is uploaded.',
        'vector': [0.75, 0.20, 0.30, 0.50, 0.10, 0.30, 0.98, 0.40],
    },
    {
        'id': 'CASE-2022-FRONTRUN',
        'caseName': 'Block Order Front-Running & Information Leakage (2022)',
        'caseYear': 2022,
        'category': 'Market Abuse (MAR)',
        'regulator': 'BaFin / ESMA',
        'fineAmount': '€95 Million',
        'description': 'Prop desk executed personal/firm hedge trades milliseconds prior to executing client €50M+ block order.',
        'keyPattern': 'Prop/hedge order placed in same instrument within 30 seconds preceding large client order.',
        'mitigationStrategy': 'Enforce strict Chinese wall & order queue time lock; auto-suspend prop trading on active client block.',
        'vector': [0.95, 0.70, 0.60, 0.80, 0.05, 0.50, 0.05, 0.95],
    },
    {
        'id': 'CASE-2023-SPOOF',
        'caseName': 'High-Frequency Quote Spoofing & Layering (2023)',
        'caseYear': 2023,
        'category': 'Order Book Manipulation',
        'regulator': 'BaFin',
        'fineAmount': '€60 Million',
        'description': 'Rapid creation and cancellation of non-bona fide orders to artificially move order book depth.',
        'keyPattern': 'High order-to-trade ratio (>50:1) with rapid cancellation times under 500ms.',
        'mitigationStrategy': 'Throttle algo order entry rate and flag desk to Market Abuse Surveillance.',
        'vector': [0.40, 0.50, 0.70, 0.20, 0.05, 0.20, 0.05, 0.99],
    },
]

def build_order_vector(
    size_eur: float,
    asset_class: str,
    kyc_status: str,
    aml_risk_level: str,
    comms_text: str = '',
    is_off_market: bool = False
) -> list:
    size_factor = min(1.0, size_eur / 60_000_000)
    spread_factor = 0.9 if is_off_market else 0.2
    off_market_factor = 0.95 if is_off_market else 0.15

    lower_comms = (comms_text or '').lower()
    comms_flag = 0.95 if ('fix' in lower_comms or 'benchmark' in lower_comms or 'offset' in lower_comms or 'chat' in lower_comms) else 0.1

    retail_flag = 0.8 if kyc_status == 'EXPIRED' else 0.1
    high_yield_flag = 0.9 if asset_class == 'Credit' else (0.5 if asset_class == 'Rates' else 0.2)
    unverified_kyc_flag = 0.98 if kyc_status in ['PENDING', 'EXPIRED'] or aml_risk_level in ['CRITICAL', 'HIGH'] else 0.05
    high_freq_flag = 0.85 if is_off_market and size_eur > 30_000_000 else 0.15

    return [
        round(size_factor, 2),
        round(spread_factor, 2),
        round(off_market_factor, 2),
        round(comms_flag, 2),
        round(retail_flag, 2),
        round(high_yield_flag, 2),
        round(unverified_kyc_flag, 2),
        round(high_freq_flag, 2),
    ]

def match_precrime_pattern(order_vector: list) -> dict:
    best_match = None
    highest_sim = -1.0

    for fc in SEEDED_FINE_CASES:
        sim = cosine_similarity(order_vector, fc['vector'])
        if sim > highest_sim:
            highest_sim = sim
            best_match = fc

    if not best_match:
        best_match = SEEDED_FINE_CASES[0]
        highest_sim = 0.5

    return {
        'caseId': best_match['id'],
        'caseName': best_match['caseName'],
        'similarityScore': round(highest_sim, 3),
        'matchedPattern': best_match['keyPattern'],
        'fineCaseDescription': best_match['description'],
        'recommendedAction': best_match['mitigationStrategy'],
        'regulatorFine': f"{best_match['regulator']} ({best_match['fineAmount']})",
    }
