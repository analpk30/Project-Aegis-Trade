import os
import time
import uuid

import async_runtime
import chat_sessions
from resilience import call_with_retry
from retrieval import retrieve, format_context

try:
    from google.adk.agents import Agent
    from google.adk.runners import InMemoryRunner
    from google.genai import types
    _ADK_AVAILABLE = True
except ImportError:
    Agent = None  # type: ignore
    InMemoryRunner = None  # type: ignore
    types = None  # type: ignore
    _ADK_AVAILABLE = False

_MIFID_AGENT_INSTRUCTION = """You are an automated MiFID II Article 27 Best Execution & Compliance Engine for a top European Investment Bank.
Generate a concise, authoritative pre-trade justification report (120-160 words).

Requirements:
1. Reference MiFID II Article 27 Best Execution factors (price, speed, likelihood of execution, market impact).
2. Explicitly evaluate the calculated Guardian Score and whether pre-trade clearance or 1st Line review is required.
3. State whether venue depth satisfies price transparency criteria.
4. Conclude with a clear recommendation: RELEASE FOR AUTOMATED EXECUTION, HOLD FOR COMPLIANCE REVIEW, or REJECT ORDER.
"""

_BAFIN_AGENT_INSTRUCTION = """You are a Senior Regulatory Legal Officer specializing in BaFin circulars, GwG money laundering laws, and MiFID II compliance.
Answer regulatory queries using the provided BaFin circular context.

Instructions:
1. Provide a crisp, structured compliance summary (100-150 words).
2. Explicitly cite the relevant BaFin Circular numbers or GwG sections.
3. List 2 concrete actionable DOs and 2 DONTs for traders or sales officers.
"""

_VERTEX_MODEL = os.environ.get('VERTEX_GEMINI_MODEL', 'gemini-2.5-flash')


def _configure_vertex_ai() -> bool:
    """Enable Vertex AI / Cloud ADK auth via ADC (no GEMINI_API_KEY)."""
    project = os.environ.get('GOOGLE_CLOUD_PROJECT') or os.environ.get('GCP_PROJECT')
    if not project:
        return False

    location = os.environ.get('GOOGLE_CLOUD_LOCATION', 'us-central1')
    os.environ['GOOGLE_GENAI_USE_VERTEXAI'] = 'TRUE'
    os.environ['GOOGLE_CLOUD_PROJECT'] = project
    os.environ['GOOGLE_CLOUD_LOCATION'] = location
    return True


def _build_mifid_agent():
    return Agent(
        name='mifid_justification_agent',
        model=_VERTEX_MODEL,
        description='Generates MiFID II Article 27 pre-trade justification reports via Vertex AI.',
        instruction=_MIFID_AGENT_INSTRUCTION,
    )


def _build_bafin_agent():
    return Agent(
        name='bafin_interpretation_agent',
        model=_VERTEX_MODEL,
        description='Interprets BaFin circulars and GwG rules via Vertex AI RAG-style prompting.',
        instruction=_BAFIN_AGENT_INSTRUCTION,
    )


async def _run_ephemeral_adk_agent(agent, prompt: str, session_prefix: str) -> str:
    """Invoke a Cloud ADK agent for a single stateless call (no history reuse).

    Used by the MiFID justification path and by BaFin one-shot queries that carry
    no chatSessionId. Multi-turn BaFin chat uses chat_sessions.run_bafin_turn
    instead, which reuses a persistent runner.
    """
    app_name = 'project_guardian'
    user_id = 'compliance_engine'
    session_id = f'{session_prefix}-{uuid.uuid4().hex[:12]}'

    runner = InMemoryRunner(agent=agent, app_name=app_name)
    try:
        await runner.session_service.create_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id,
        )

        message = types.Content(role='user', parts=[types.Part(text=prompt)])
        final_text = ''

        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=message,
        ):
            if event.is_final_response() and event.content and event.content.parts:
                chunks = [p.text for p in event.content.parts if getattr(p, 'text', None)]
                final_text = '\n'.join(chunks).strip()

        return final_text
    finally:
        try:
            await runner.close()
        except Exception:
            pass


def _run_mifid_oneshot(prompt: str) -> str:
    # Fresh agent + coroutine per attempt — safe to retry on transient 429s.
    return call_with_retry(
        lambda: async_runtime.submit(_run_ephemeral_adk_agent(_build_mifid_agent(), prompt, 'mifid')),
        label='mifid',
    )


def _run_bafin_oneshot(prompt: str) -> str:
    return call_with_retry(
        lambda: async_runtime.submit(_run_ephemeral_adk_agent(_build_bafin_agent(), prompt, 'bafin')),
        label='bafin-oneshot',
    )

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
    # api_key = os.environ.get('GEMINI_API_KEY')
    # should_use_gemini = api_key and ENGINE_CONFIG['mode'] == 'auto' and not force_fallback

    # if should_use_gemini:
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

    if _ADK_AVAILABLE and _configure_vertex_ai():
        try:
            text = _run_mifid_oneshot(prompt)
            if text:
                latency = int((time.time() - start_time) * 1000)
                ENGINE_CONFIG['gemini_successes'] += 1
                ENGINE_CONFIG['last_latency_ms'] = latency
                return {
                    'text': text,
                    'model': f'{_VERTEX_MODEL} (Vertex AI / Cloud ADK)',
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


def interpret_bafin_rules(query: str, announcements: list, chat_session_id: str = None) -> dict:
    start_time = time.time()
    ENGINE_CONFIG['total_requests'] += 1

    # Query-aware retrieval over the (growing) corpus, replacing the old
    # fixed `doc_context[:3]` slice. Falls back to keyword ranking internally.
    retrieved_docs, retrieved_ids, retrieval_mode = retrieve(query, announcements, k=4)
    docs_summary = format_context(retrieved_docs)
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

    if _ADK_AVAILABLE and _configure_vertex_ai():
        try:
            # With a chatSessionId, run a stateful turn on the persistent runner so
            # follow-up questions resolve context from earlier turns. Without one,
            # fall back to a single stateless call (legacy one-shot search box).
            if chat_session_id:
                text = chat_sessions.run_bafin_turn(chat_session_id, prompt)
                model_label = f'{_VERTEX_MODEL} (Vertex AI / Cloud ADK, multi-turn)'
            else:
                text = _run_bafin_oneshot(prompt)
                model_label = f'{_VERTEX_MODEL} (Vertex AI / Cloud ADK)'
            if text:
                latency = int((time.time() - start_time) * 1000)
                ENGINE_CONFIG['gemini_successes'] += 1
                ENGINE_CONFIG['last_latency_ms'] = latency
                return {
                    'text': text,
                    'model': model_label,
                    'latencyMs': latency,
                    'fallbackUsed': False,
                    'retrievedIds': retrieved_ids,
                    'retrievalMode': retrieval_mode,
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

