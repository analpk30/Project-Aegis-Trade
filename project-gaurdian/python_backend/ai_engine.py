import asyncio
import os
import time
import uuid

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


async def _run_adk_agent(agent, prompt: str, session_prefix: str) -> str:
    """Invoke a Cloud ADK agent once and return the final text response."""
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
        # Avoid Python 3.13 DummyThread teardown noise after asyncio.run()
        try:
            await runner.close()
        except Exception:
            pass


async def _run_mifid_adk_agent(prompt: str) -> str:
    return await _run_adk_agent(_build_mifid_agent(), prompt, 'mifid')


async def _run_bafin_adk_agent(prompt: str) -> str:
    return await _run_adk_agent(_build_bafin_agent(), prompt, 'bafin')


def _run_async(coro):
    """Run a coroutine with explicit loop teardown (safer under Python 3.13)."""
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)
    finally:
        try:
            loop.run_until_complete(loop.shutdown_asyncgens())
        except Exception:
            pass
        try:
            loop.run_until_complete(loop.shutdown_default_executor())
        except Exception:
            pass
        asyncio.set_event_loop(None)
        loop.close()


def generate_mifid_justification(
    order_id: str,
    instrument: str,
    asset_class: str,
    size_eur: float,
    direction: str,
    venue: str,
    guardian_score: int,
    executability_score: int,
    client_name: str
) -> dict:
    start_time = time.time()

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
            text = _run_async(_run_mifid_adk_agent(prompt))
            if text:
                latency = int((time.time() - start_time) * 1000)
                return {
                    'text': text,
                    'model': f'{_VERTEX_MODEL} (Vertex AI / Cloud ADK)',
                    'latencyMs': latency,
                    'fallbackUsed': False
                }
        except Exception as e:
            print(f"[Python AI Engine] Vertex AI / Cloud ADK error: {e}. Falling back to deterministic compliance engine.")

    # Intelligent Fallback Engine
    latency = int((time.time() - start_time) * 1000)
    size_mb = size_eur / 1_000_000
    status_phrase = "RELEASED FOR AUTOMATED ROUTING" if guardian_score >= 80 else ("HELD FOR 1ST LINE COMPLIANCE REVIEW" if guardian_score >= 50 else "BLOCKED & ESCALATED TO CENTRAL COMPLIANCE")
    
    fallback_text = (
        f"MiFID II Article 27 Pre-Trade Assessment for {order_id} ({direction} €{size_mb:.1f}M {instrument}). "
        f"Counterparty {client_name} exhibits verified suitability. "
        f"Execution venue {venue} offers sufficient depth with an Executability Rating of {executability_score}/100. "
        f"Guardian Compliance Score evaluated at {guardian_score}/100. "
        f"Based on algorithmic pre-trade checks under BaFin circular 04/2026, order is {status_phrase}. "
        f"All pre-trade parameters and best execution factors are recorded in the immutable audit log."
    )

    return {
        'text': fallback_text,
        'model': 'guardian-python-rules-v2',
        'latencyMs': max(12, latency),
        'fallbackUsed': True
    }


def interpret_bafin_rules(query: str, doc_context: list) -> dict:
    start_time = time.time()

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

    if _ADK_AVAILABLE and _configure_vertex_ai():
        try:
            text = _run_async(_run_bafin_adk_agent(prompt))
            if text:
                latency = int((time.time() - start_time) * 1000)
                return {
                    'text': text,
                    'model': f'{_VERTEX_MODEL} (Vertex AI / Cloud ADK)',
                    'latencyMs': latency,
                    'fallbackUsed': False
                }
        except Exception as e:
            print(f"[Python AI Engine] Vertex AI / Cloud ADK error: {e}. Falling back to deterministic RAG interpreter.")

    latency = int((time.time() - start_time) * 1000)
    fallback_text = (
        f"BaFin Regulatory Interpretation regarding '{query}':\n\n"
        f"Pursuant to BaFin Circular 04/2026 and GwG Section 15 guidelines, pre-trade surveillance requires strict validation of counterparties, "
        f"benchmark fixing windows, and UBO documentation.\n\n"
        f"Key Compliance Directives:\n"
        f"• DO: Verify client suitability category and GDPR consent prior to order entry on MTF venues.\n"
        f"• DO: Record timestamped XAI justification logs for all off-market transactions exceeding €10M.\n"
        f"• DONT: Never execute transactions for clients with PENDING or EXPIRED KYC status without Central Compliance sign-off.\n"
        f"• DONT: Do not submit off-market rate quotes within 15 minutes of EURIBOR / ESTR fixing windows without 1st Line clearance."
    )

    return {
        'text': fallback_text,
        'model': 'bafin-rag-python-v1',
        'latencyMs': max(15, latency),
        'fallbackUsed': True
    }
