import json
import os
import re
import sys
import time
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from pathlib import Path
import urllib.parse

# Load repo-root .env so `npm run dev` (plain `python3 app.py`) picks up
# GOOGLE_CLOUD_PROJECT etc. Without this the server runs with no project set and
# silently drops to keyword retrieval + deterministic fallback.
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[2] / '.env')
except Exception:
    pass

from ai_engine import generate_mifid_justification, interpret_bafin_rules, get_engine_status, set_engine_mode


# Ensure local imports work regardless of working directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from store import store, PERSONA_CONFIG
from scoring import compute_guardian_score
from vector_engine import build_order_vector, match_precrime_pattern, SEEDED_FINE_CASES
from audit import log_audit_event, get_audit_logs, subscribe_audit
from ai_engine import generate_mifid_justification, interpret_bafin_rules
from chat_sessions import reset_session as reset_bafin_session

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class RequestHandler(BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def parse_json_body(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                body = self.rfile.read(content_length)
                return json.loads(body.decode('utf-8'))
        except Exception:
            pass
        return {}

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)

        # 1. Health check
        if path == '/api/health':
            self.send_json({
                'status': 'ok',
                'backend': 'Python AI Engine (Python 3.10)',
                'activePersona': store.active_persona,
                'activeUser': store.active_user,
                'ordersCount': len(store.orders),
                'clientsCount': len(store.clients),
                'fineCasesCount': len(SEEDED_FINE_CASES),
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            })
            return
        
        if path == '/api/engine/status':
            self.send_json(get_engine_status())
            return

        # 2. Auth Persona
        if path == '/api/auth/persona':
            all_personas = [
                {
                    'role': role,
                    'name': config['name'],
                    'defaultRoute': config['defaultRoute'],
                    'description': config['description'],
                }
                for role, config in PERSONA_CONFIG.items()
            ]
            self.send_json({
                'activePersona': store.active_persona,
                'activeUser': store.active_user,
                'config': PERSONA_CONFIG.get(store.active_persona, PERSONA_CONFIG['Trader']),
                'allPersonas': all_personas
            })
            return

        # 3. Orders Blotter
        if path == '/api/orders':
            self.send_json({'orders': store.orders})
            return

        if path.startswith('/api/orders/'):
            order_id = path.replace('/api/orders/', '')
            order = next((o for o in store.orders if o['id'] == order_id), None)
            if order:
                self.send_json({'order': order})
            else:
                self.send_json({'error': 'Order not found'}, status=404)
            return

        # 4. Clients
        if path == '/api/clients':
            self.send_json({'clients': store.clients})
            return

        if path.startswith('/api/clients/'):
            client_id = path.replace('/api/clients/', '')
            client = next((c for c in store.clients if c['id'] == client_id), None)
            if client:
                self.send_json({'client': client})
            else:
                self.send_json({'error': 'Client not found'}, status=404)
            return

        # 5. Ideas
        if path == '/api/ideas':
            self.send_json({'ideas': store.ideas})
            return

        # 6. BaFin Circulars
        if path == '/api/bafin':
            self.send_json({'announcements': store.bafin_announcements})
            return

        # 7. Risk Anomalies & Hedges
        if path == '/api/risk/anomalies':
            self.send_json({'anomalies': store.anomalies})
            return

        if path.startswith('/api/risk/hedges/'):
            self.send_json({'hedges': store.hedges})
            return

        # 8. Audit Logs
        if path == '/api/audit':
            persona = query_params.get('persona', [None])[0]
            module_name = query_params.get('module', [None])[0]
            logs = get_audit_logs(persona=persona, module=module_name)
            self.send_json({'logs': logs})
            return

        # 9. Executive KPIs
        if path == '/api/executive/kpis':
            self.send_json({'metrics': store.executive_metrics})
            return

        # 10. Global Search
        if path == '/api/search':
            q = (query_params.get('q', [''])[0]).lower().strip()
            if not q:
                self.send_json({'results': {'orders': [], 'clients': [], 'bafin': [], 'fineCases': []}})
                return

            matching_orders = [o for o in store.orders if q in o['id'].lower() or q in o['instrument'].lower() or q in o['clientName'].lower()]
            matching_clients = [c for c in store.clients if q in c['name'].lower() or q in c['id'].lower()]
            matching_bafin = [b for b in store.bafin_announcements if q in b['title'].lower() or q in b['summary'].lower()]
            matching_cases = [fc for fc in SEEDED_FINE_CASES if q in fc['caseName'].lower() or q in fc['category'].lower()]

            self.send_json({
                'results': {
                    'orders': matching_orders,
                    'clients': matching_clients,
                    'bafin': matching_bafin,
                    'fineCases': matching_cases
                }
            })
            return

        # 11. OpenAPI Docs
        if path == '/api/docs':
            self.send_json({
                'openapi': '3.0.0',
                'info': {
                    'title': 'Project Guardian API (Python AI Backend)',
                    'version': '2.0.0',
                    'description': 'Predictive Compliance & Front-Office Intelligence API powered by Python AI Backend.'
                },
                'paths': {
                    '/api/auth/persona': {'get': {'summary': 'Get current persona'}, 'post': {'summary': 'Switch persona role'}},
                    '/api/orders': {'get': {'summary': 'Get active blotter orders'}},
                    '/api/orders/{id}/autopilot': {'post': {'summary': 'Stream MiFID II justification'}},
                    '/api/precrime/score': {'post': {'summary': 'Compute vector similarity to historical fine cases'}},
                    '/api/bafin/interpret': {'post': {'summary': 'BaFin rulebook RAG query'}},
                }
            })
            return

        # 12. SSE Realtime Pulse Stream
        if path == '/api/stream':
            self.send_response(200)
            self.send_cors_headers()
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.end_headers()

            try:
                avg_score = round(sum(o['guardianScore'] for o in store.orders) / max(1, len(store.orders)))
                pulse_msg = {
                    'type': 'pulse',
                    'guardianAvgScore': avg_score,
                    'activeOrders': len(store.orders),
                    'unreadAlertsCount': len(store.anomalies),
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }
                self.wfile.write(f"data: {json.dumps(pulse_msg)}\n\n".encode('utf-8'))
                self.wfile.flush()
            except Exception:
                pass
            return

        self.send_json({'error': 'Endpoint not found'}, status=404)


    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        body = self.parse_json_body()
        # Engine Mode Toggle
        if path == '/api/engine/mode':
            mode = body.get('mode', 'auto')
            updated = set_engine_mode(mode)
            log_audit_event(
                module='Dual-Engine Controller',
                persona=store.active_persona,
                user=store.active_user,
                action=f"Engine Mode Switched to '{mode.upper()}'",
                reasoning_payload=f"System operation mode updated to '{mode}'. Primary Gemini AI & Local Statistical Vector Model configuration recalculated.",
                guardian_score_at_time=98,
                model_used='dual-engine-controller',
                latency_ms=1,
                fallback_used=(mode == 'force_fallback')
            )
            self.send_json({'success': True, 'engineStatus': get_engine_status()})
            return

        # Engine Parallel Benchmark Test
        if path == '/api/engine/benchmark':
            test_order_id = body.get('orderId', store.orders[0]['id'])
            order = next((o for o in store.orders if o['id'] == test_order_id), store.orders[0])

            # 1. Run Gemini Primary AI (if available)
            primary_res = generate_mifid_justification(
                order_id=order['id'],
                instrument=order['instrument'],
                asset_class=order['assetClass'],
                size_eur=order['sizeEur'],
                direction=order['direction'],
                venue=order['venue'],
                guardian_score=order['guardianScore'],
                executability_score=order['scoreBreakdown']['executabilityScore'],
                client_name=order['clientName'],
                force_fallback=False
            )

            # 2. Force Local Statistical Vector Model
            fallback_res = generate_mifid_justification(
                order_id=order['id'],
                instrument=order['instrument'],
                asset_class=order['assetClass'],
                size_eur=order['sizeEur'],
                direction=order['direction'],
                venue=order['venue'],
                guardian_score=order['guardianScore'],
                executability_score=order['scoreBreakdown']['executabilityScore'],
                client_name=order['clientName'],
                force_fallback=True
            )

            self.send_json({
                'orderId': order['id'],
                'primaryResult': primary_res,
                'fallbackResult': fallback_res,
                'latencyDeltaMs': abs(primary_res['latencyMs'] - fallback_res['latencyMs'])
            })
            return


        # 1. Switch Persona
        if path == '/api/auth/persona':
            role = body.get('role')
            if not role or role not in PERSONA_CONFIG:
                self.send_json({'error': 'Invalid persona role'}, status=400)
                return

            store.active_persona = role
            store.active_user = f"{PERSONA_CONFIG[role]['name']} ({role})"

            log_audit_event(
                module='Persona Switcher',
                persona=store.active_persona,
                user=store.active_user,
                action=f"Authenticated Persona Switched to {role}",
                reasoning_payload=f"User session switched to role '{role}'. Allowed routes: [{', '.join(PERSONA_CONFIG[role]['allowedRoutes'])}].",
                guardian_score_at_time=95,
                model_used='python-auth-engine',
                latency_ms=2,
                fallback_used=False
            )

            self.send_json({
                'success': True,
                'activePersona': store.active_persona,
                'activeUser': store.active_user,
                'config': PERSONA_CONFIG[role]
            })
            return

        # 2. MiFID II AutoPilot Stream (SSE)
        if re.match(r'^/api/orders/[^/]+/autopilot$', path):
            order_id = path.split('/')[3]
            order = next((o for o in store.orders if o['id'] == order_id), None)
            if not order:
                self.send_json({'error': 'Order not found'}, status=404)
                return

            client = next((c for c in store.clients if c['id'] == order['clientId']), store.clients[0])
            has_consent = client['gdprConsentMap'].get(order['assetClass'], False)

            computed = compute_guardian_score(
                size_eur=order['sizeEur'],
                asset_class=order['assetClass'],
                venue=order['venue'],
                kyc_status=client['kycStatus'],
                aml_risk_level=client['amlRiskLevel'],
                suitability_category=client['suitabilityCategory'],
                gdpr_consent=has_consent,
                precrime_similarity_score=order.get('precrimeMatch', {}).get('similarityScore', 0.0)
            )

            order['guardianScore'] = computed['score']
            order['scoreBreakdown'] = computed['breakdown']

            # SSE Header setup
            self.send_response(200)
            self.send_cors_headers()
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.end_headers()

            # Start message
            self.wfile.write(f"data: {json.dumps({'type': 'start', 'orderId': order_id, 'guardianScore': computed['score'], 'breakdown': computed['breakdown']})}\n\n".encode('utf-8'))
            self.wfile.flush()

            # Generate AI Justification via Python AI Engine
            llm_result = generate_mifid_justification(
                order_id=order['id'],
                instrument=order['instrument'],
                asset_class=order['assetClass'],
                size_eur=order['sizeEur'],
                direction=order['direction'],
                venue=order['venue'],
                guardian_score=computed['score'],
                executability_score=computed['breakdown']['executabilityScore'],
                client_name=order['clientName']
            )

            order['mifidJustification'] = llm_result['text']

            # Stream chunk
            self.wfile.write(f"data: {json.dumps({'type': 'chunk', 'text': llm_result['text']})}\n\n".encode('utf-8'))
            self.wfile.flush()

            # Audit entry
            audit_entry = log_audit_event(
                module='MiFID II AutoPilot',
                persona=store.active_persona,
                user=store.active_user,
                action=f"Executed Python AutoPilot Analysis for {order['id']}",
                reasoning_payload=f"Computed Guardian Score: {computed['score']}/100. Executability: {computed['breakdown']['executabilityScore']}. Justification: '{llm_result['text']}'",
                guardian_score_at_time=computed['score'],
                model_used=llm_result['model'],
                latency_ms=llm_result['latencyMs'],
                fallback_used=llm_result['fallbackUsed']
            )

            self.wfile.write(f"data: {json.dumps({'type': 'complete', 'order': order, 'auditEntry': audit_entry})}\n\n".encode('utf-8'))
            self.wfile.flush()
            return

        # 3. Approve Order
        if re.match(r'^/api/orders/[^/]+/approve$', path):
            order_id = path.split('/')[3]
            order = next((o for o in store.orders if o['id'] == order_id), None)
            if not order:
                self.send_json({'error': 'Order not found'}, status=404)
                return

            order['status'] = 'Approved'
            order['workflowStep'] = 'APPROVED'
            order['updatedAt'] = datetime.utcnow().isoformat() + 'Z'

            audit_entry = log_audit_event(
                module='Workflow Automator',
                persona=store.active_persona,
                user=store.active_user,
                action=f"Approved & Released Order {order['id']}",
                reasoning_payload=f"Order {order['id']} ({order['direction']} €{order['sizeEur']/1e6:.1f}M {order['instrument']}) approved by {store.active_user}. Immutable audit record created.",
                guardian_score_at_time=order['guardianScore'],
                model_used='python-workflow-engine',
                latency_ms=4,
                fallback_used=False
            )

            self.send_json({'success': True, 'order': order, 'auditEntry': audit_entry})
            return

        # 4. Pre-Crime Vector Similarity
        if path == '/api/precrime/score':
            client_id = body.get('clientId', 'CL-IT-3301')
            client = next((c for c in store.clients if c['id'] == client_id), store.clients[0])

            size_eur = body.get('sizeEur', 50000000)
            asset_class = body.get('assetClass', 'Rates')
            comms_text = body.get('commsText', '')

            order_vec = build_order_vector(
                size_eur=size_eur,
                asset_class=asset_class,
                kyc_status=client['kycStatus'],
                aml_risk_level=client['amlRiskLevel'],
                comms_text=comms_text,
                is_off_market=size_eur > 30000000
            )

            match = match_precrime_pattern(order_vec)

            audit_entry = log_audit_event(
                module='Pre-Crime Modeler',
                persona=store.active_persona,
                user=store.active_user,
                action='Calculated Python Cosine Vector Similarity',
                reasoning_payload=f"Feature vector similarity calculated. Top match: '{match['caseName']}' with vector similarity {match['similarityScore']}. Action: {match['recommendedAction']}.",
                guardian_score_at_time=42 if match['similarityScore'] > 0.7 else 88,
                model_used='python-numpy-cosine-similarity',
                latency_ms=12,
                fallback_used=False
            )

            self.send_json({
                'match': match,
                'orderVector': order_vec,
                'fineCasesCorpus': SEEDED_FINE_CASES,
                'auditEntry': audit_entry
            })
            return

        # 5. Convert Idea to Blotter Order
        if re.match(r'^/api/ideas/[^/]+/send-to-blotter$', path):
            idea_id = path.split('/')[3]
            idea = next((i for i in store.ideas if i['id'] == idea_id), None)
            if not idea:
                self.send_json({'error': 'Idea not found'}, status=404)
                return

            new_order_id = f"ORD-2026-{int(time.time()*1000)%900 + 100}"
            new_order = {
                'id': new_order_id,
                'traderId': body.get('traderId', 'TRD-8821'),
                'traderName': body.get('traderName', 'Alex Vance'),
                'clientId': idea['clientId'],
                'clientName': idea['clientName'],
                'instrument': idea['orderDraft']['instrument'],
                'assetClass': idea['assetClass'],
                'sizeEur': idea['orderDraft']['sizeEur'],
                'direction': idea['orderDraft']['direction'],
                'venue': idea['orderDraft']['venue'],
                'status': 'Pending',
                'guardianScore': 92,
                'scoreBreakdown': {
                    'executabilityScore': 95,
                    'violationRiskScore': 90,
                    'consentScore': 100,
                    'regulatoryCapitalImpact': 85,
                },
                'mifidJustification': f"Draft generated from Guardian-Approved Idea {idea['id']}. Alpha expected: +{idea['expectedAlphaBps']}bps.",
                'precrimeMatch': None,
                'workflowStep': 'DRAFT',
                'createdAt': datetime.utcnow().isoformat() + 'Z',
                'updatedAt': datetime.utcnow().isoformat() + 'Z',
            }

            store.orders.insert(0, new_order)

            audit_entry = log_audit_event(
                module='Idea Generator',
                persona=store.active_persona,
                user=store.active_user,
                action=f"Converted Idea {idea['id']} to Order Draft {new_order_id}",
                reasoning_payload=f"Idea '{idea['title']}' for {idea['clientName']} converted to draft {new_order_id}.",
                guardian_score_at_time=92,
                model_used='python-idea-engine',
                latency_ms=6,
                fallback_used=False
            )

            self.send_json({'success': True, 'newOrder': new_order, 'auditEntry': audit_entry})
            return

        # 6. BaFin RAG Interpretation
        if path == '/api/bafin/interpret':
            query = body.get('query', '')
            chat_session_id = body.get('chatSessionId')

            # Retrieval now happens inside interpret_bafin_rules (query-aware,
            # over the full growing corpus) rather than a fixed slice here.
            # chatSessionId (when present) enables multi-turn follow-ups.
            interpretation = interpret_bafin_rules(query, store.bafin_announcements, chat_session_id)
            retrieved_ids = interpretation.get('retrievedIds', [])
            retrieval_mode = interpretation.get('retrievalMode', 'keyword')

            # The retrieved subset is what actually grounded the answer — surface
            # it (not the whole corpus) so the UI can cite the exact circulars.
            matching = [a for a in store.bafin_announcements if a['id'] in retrieved_ids]

            audit_entry = log_audit_event(
                module='BaFin Interpreter',
                persona=store.active_persona,
                user=store.active_user,
                action=f"Executed Regulatory RAG Query: '{query}'",
                reasoning_payload=(
                    f"Retrieved {len(retrieved_ids)} of {len(store.bafin_announcements)} "
                    f"BaFin circulars via {retrieval_mode} ranking (ids: {', '.join(retrieved_ids) or 'none'}). "
                    f"Python RAG Interpretation: '{interpretation['text'][:150]}...'"
                ),
                guardian_score_at_time=95,
                model_used=interpretation['model'],
                latency_ms=interpretation['latencyMs'],
                fallback_used=interpretation['fallbackUsed']
            )

            self.send_json({
                'query': query,
                'chatSessionId': chat_session_id,
                'interpretation': interpretation['text'],
                'matchingAnnouncements': matching,
                'retrievedAnnouncementIds': retrieved_ids,
                'retrievalMode': retrieval_mode,
                'auditEntry': audit_entry
            })
            return

        # 6b. Reset a BaFin chat conversation (frontend "clear chat")
        if path == '/api/bafin/chat/reset':
            chat_session_id = body.get('chatSessionId')
            if not chat_session_id:
                self.send_json({'error': 'chatSessionId required'}, status=400)
                return
            reset_bafin_session(chat_session_id)
            self.send_json({'success': True, 'chatSessionId': chat_session_id})
            return

        # 6c. Cross-Market Anomaly Engine — demo regime controls
        if path == '/api/risk/simulate-shock' or path == '/api/risk/simulate-reset':
            regime = 'stressed' if path.endswith('shock') else 'normal'
            try:
                from anomaly_runtime import set_regime
                active = set_regime(regime)
                log_audit_event(
                    module='Cross-Market Risk Engine',
                    persona=store.active_persona,
                    user=store.active_user,
                    action=f"Market regime switched to {active.upper()}",
                    reasoning_payload=f"Anomaly engine regime set to '{active}'. Cross-market correlation structure will {'destabilise' if active == 'stressed' else 'normalise'} over subsequent ticks.",
                    guardian_score_at_time=42 if active == 'stressed' else 95,
                    model_used='mahalanobis-cross-market-v1',
                    latency_ms=2,
                    fallback_used=False,
                )
                self.send_json({'success': True, 'regime': active})
            except Exception as e:
                self.send_json({'error': f'anomaly engine unavailable: {e}'}, status=503)
            return

        # 6d. AI Risk Briefing — narrate the current top anomaly (on-demand LLM)
        if path == '/api/risk/anomalies/narrate':
            anomaly_id = body.get('anomalyId')
            anomaly = None
            if anomaly_id:
                anomaly = next((a for a in store.anomalies if a['id'] == anomaly_id), None)
            if anomaly is None and store.anomalies:
                anomaly = store.anomalies[0]
            if anomaly is None:
                self.send_json({'error': 'no active anomaly to narrate'}, status=404)
                return

            from ai_engine import narrate_risk_anomaly
            result = narrate_risk_anomaly(anomaly)

            log_audit_event(
                module='Cross-Market Risk Engine',
                persona=store.active_persona,
                user=store.active_user,
                action=f"Generated AI Risk Briefing for {anomaly['id']}",
                reasoning_payload=f"Narrated {anomaly.get('alertLevel')} anomaly at {anomaly.get('deviationSigma')}σ. Briefing: '{result['text'][:140]}...'",
                guardian_score_at_time=42 if anomaly.get('alertLevel') == 'RED' else 90,
                model_used=result['model'],
                latency_ms=result['latencyMs'],
                fallback_used=result['fallbackUsed'],
            )
            self.send_json({
                'anomalyId': anomaly['id'],
                'narrative': result['text'],
                'model': result['model'],
                'fallbackUsed': result['fallbackUsed'],
            })
            return

        # 7. Audit Export PDF
        if path == '/api/audit/export':
            log_audit_event(
                module='Audit & Compliance',
                persona=store.active_persona,
                user=store.active_user,
                action='Exported Official BaFin Audit Trail Report',
                reasoning_payload='Generated downloadable BaFin regulatory PDF containing immutable XAI reasoning logs.',
                guardian_score_at_time=99,
                model_used='python-pdf-reporter',
                latency_ms=10,
                fallback_used=False
            )

            pdf_content = (
                f"%PDF-1.4\n1 0 obj\n<< /Title (Project Guardian BaFin Audit Report) /Author (Project Guardian Python Engine) >>\nendobj\n"
                f"2 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n"
                f"3 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n"
                f"4 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
                f"xref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000100 00000 n \n0000000150 00000 n \n0000000210 00000 n \n"
                f"trailer\n<< /Size 5 /Root 2 0 R >>\nstartxref\n280\n%%EOF"
            )

            self.send_response(200)
            self.send_cors_headers()
            self.send_header('Content-Type', 'application/pdf')
            self.send_header('Content-Disposition', 'attachment; filename="Project_Guardian_BaFin_Audit_Report.pdf"')
            self.end_headers()
            self.wfile.write(pdf_content.encode('utf-8'))
            return

        self.send_json({'error': 'Endpoint not found'}, status=404)

def run_server(port=5000):
    server_address = ('0.0.0.0', port)
    httpd = ThreadedHTTPServer(server_address, RequestHandler)
    print(f"==================================================")
    print(f"🚀 Python AI Backend Online on http://0.0.0.0:{port}")
    print(f"==================================================")
    # Start the live cross-market anomaly engine (computes store.anomalies).
    try:
        from anomaly_runtime import start_engine
        start_engine(store)
    except Exception as e:
        print(f"[AnomalyEngine] not started ({e}); serving seeded anomalies")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5050
    run_server(port)
