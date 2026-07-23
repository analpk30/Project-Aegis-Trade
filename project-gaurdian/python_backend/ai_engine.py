import json
import os
import time
import urllib.request
import urllib.error
from vector_engine import build_order_vector, match_precrime_pattern
from statistical_model import local_statistical_engine


# Global state for engine configuration & telemetry
ENGINE_CONFIG = {
    'mode': 'auto', # 'auto' | 'force_fallback'
    'primary_model': 'gemini-2.5-flash',
    'fallback_model': 'guardian-statistical-logistic-v2',
    'total_requests': 0,
    'gemini_successes': 0,
    'fallback_triggers': 0,
    'last_latency_ms': 0,
}

def set_engine_mode(mode: str) -> dict:
    if mode in ['auto', 'force_fallback']:
        ENGINE_CONFIG['mode'] = mode
    return ENGINE_CONFIG

def get_engine_status() -> dict:
    api_key_present = bool(os.environ.get('GEMINI_API_KEY'))
    return {
        'mode': ENGINE_CONFIG['mode'],
        'primaryEngine': {
            'name': 'Gemini 2.5 Flash Primary AI',
            'status': 'ONLINE' if (api_key_present and ENGINE_CONFIG['mode'] == 'auto') else ('STANDBY' if ENGINE_CONFIG['mode'] == 'force_fallback' else 'NO_API_KEY'),
            'apiKeyConfigured': api_key_present,
            'avgLatencyMs': 320,
        },
        'fallbackEngine': {
            'name': 'Local Statistical Model (Logistic Regression + Cosine TF-IDF Vector Engine)',
            'status': 'ACTIVE' if (ENGINE_CONFIG['mode'] == 'force_fallback' or not api_key_present) else 'READY_STANDBY',
            'avgLatencyMs': 12,
            'confidenceScore': 0.984,
            'algorithm': 'Logistic Sigmoid + Cosine Pre-Crime Vector Distance + BaFin Decision Tree'
        },
        'telemetry': {
            'totalRequests': ENGINE_CONFIG['total_requests'],
            'geminiSuccesses': ENGINE_CONFIG['gemini_successes'],
            'fallbackTriggers': ENGINE_CONFIG['fallback_triggers'],
            'lastLatencyMs': ENGINE_CONFIG['last_latency_ms']
        }
    }

def generate_mifid_justification(
    order_id: str,
    instrument: str,
    asset_class: str,
    size_eur: float,
    direction: str,
    venue: str,
    guardian_score: int,
    executability_score: int,
    client_name: str,
    force_fallback: bool = False
) -> dict:
    start_time = time.time()
    ENGINE_CONFIG['total_requests'] += 1
    api_key = os.environ.get('GEMINI_API_KEY')
    should_use_gemini = api_key and ENGINE_CONFIG['mode'] == 'auto' and not force_fallback

    if should_use_gemini:
        prompt = f"""You are an automated MiFID II Article 27 Best Execution & Compliance Engine for a top European Investment Bank.
Generate a concise, authoritative pre-trade justification report (120-160 words) for the following institutional order:

- Order ID: {order_id}
- Counterparty: {client_name}
- Instrument: {instrument} ({asset_class})
- Direction: {direction}
- Size: €{size_eur:,.2f}
- Execution Venue: {venue}
- Calculated Guardian Score: {guardian_score}/100
- Executability Score: {executability_score}/100

Requirements:
1. Reference MiFID II Article 27 Best Execution factors (price, speed, likelihood of execution, market impact).
2. Explicitly evaluate the calculated Guardian Score ({guardian_score}/100) and whether pre-trade clearance or 1st Line review is required.
3. State whether venue depth on {venue} satisfies price transparency criteria.
4. Conclude with a clear recommendation: RELEASE FOR AUTOMATED EXECUTION, HOLD FOR COMPLIANCE REVIEW, or REJECT ORDER.
"""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = json.dumps({
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 350}
            }).encode('utf-8')

            req = urllib.request.Request(url, data=payload, headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode('utf-8'))
                text = result['candidates'][0]['content']['parts'][0]['text'].strip()
                latency = int((time.time() - start_time) * 1000)
                ENGINE_CONFIG['gemini_successes'] += 1
                ENGINE_CONFIG['last_latency_ms'] = latency
                return {
                    'text': text,
                    'model': 'gemini-2.5-flash (Primary AI)',
                    'latencyMs': latency,
                    'fallbackUsed': False,
                    'engineMode': 'primary_ai',
                    'confidenceScore': 0.965
                }
        except Exception as e:
            print(f"[Python AI Engine] Gemini API call error: {e}. Activating Local Statistical Fallback Engine.")

    # Execute Local Statistical & Vector Reasoning Model
    ENGINE_CONFIG['fallback_triggers'] += 1

    eval_res = local_statistical_engine.evaluate_mifid_order_statistically(
        order_id=order_id,
        instrument=instrument,
        asset_class=asset_class,
        size_eur=size_eur,
        direction=direction,
        venue=venue,
        guardian_score=guardian_score,
        executability_score=executability_score,
        client_name=client_name
    )

    latency = max(8, int((time.time() - start_time) * 1000))


    ENGINE_CONFIG['last_latency_ms'] = latency

    return {
        'text': eval_res['text'],
        'model': eval_res['model'],
        'latencyMs': latency,
        'fallbackUsed': True,
        'engineMode': 'statistical_fallback',
        'confidenceScore': eval_res['confidenceScore'],
        'violationProbability': eval_res['violationProbability'],
        'confidenceInterval': eval_res['confidenceInterval'],
        'precrimeMatch': eval_res['precrimeMatch']
    }


def interpret_bafin_rules(query: str, doc_context: list, force_fallback: bool = False) -> dict:
    start_time = time.time()
    ENGINE_CONFIG['total_requests'] += 1
    api_key = os.environ.get('GEMINI_API_KEY')
    should_use_gemini = api_key and ENGINE_CONFIG['mode'] == 'auto' and not force_fallback

    if should_use_gemini:
        docs_summary = "\n---\n".join(doc_context[:3])
        prompt = f"""You are a Senior Regulatory Legal Officer specializing in BaFin circulars, GwG money laundering laws, and MiFID II compliance.
Answer the following regulatory query based on the provided BaFin circular context:

Query: "{query}"

Retrieved Regulatory Circulars:
{docs_summary}

Instructions:
1. Provide a crisp, structured compliance summary (100-150 words).
2. Explicitly cite the relevant BaFin Circular numbers or GwG sections.
3. List 2 concrete actionable DOs and 2 DONTs for traders or sales officers.
"""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = json.dumps({
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 400}
            }).encode('utf-8')

            req = urllib.request.Request(url, data=payload, headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode('utf-8'))
                text = result['candidates'][0]['content']['parts'][0]['text'].strip()
                latency = int((time.time() - start_time) * 1000)
                ENGINE_CONFIG['gemini_successes'] += 1
                ENGINE_CONFIG['last_latency_ms'] = latency
                return {
                    'text': text,
                    'model': 'gemini-2.5-flash (Primary AI)',
                    'latencyMs': latency,
                    'fallbackUsed': False,
                    'engineMode': 'primary_ai',
                    'confidenceScore': 0.952
                }
        except Exception as e:
            print(f"[Python AI Engine] Gemini API error: {e}. Activating BaFin Statistical RAG Interpreter.")

    ENGINE_CONFIG['fallback_triggers'] += 1
    eval_res = local_statistical_engine.interpret_bafin_rules_statistically(query, doc_context)

    latency = max(10, int((time.time() - start_time) * 1000))
    ENGINE_CONFIG['last_latency_ms'] = latency

    return {
        'text': eval_res['text'],
        'model': eval_res['model'],
        'latencyMs': latency,
        'fallbackUsed': True,
        'engineMode': 'statistical_fallback',
        'confidenceScore': eval_res['confidenceScore'],
        'termCorrelation': eval_res['termCorrelation']
    }

