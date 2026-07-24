import time
import uuid
from datetime import datetime

audit_logs = []
subscribers = []

def log_audit_event(
    module: str,
    persona: str,
    user: str,
    action: str,
    reasoning_payload: str,
    guardian_score_at_time: int,
    model_used: str = 'python-engine',
    latency_ms: int = 10,
    fallback_used: bool = False
) -> dict:
    log_id = f"XAI-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    entry = {
        'id': log_id,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'module': module,
        'persona': persona,
        'user': user,
        'action': action,
        'reasoningPayload': reasoning_payload,
        'guardianScoreAtTime': guardian_score_at_time,
        'modelUsed': model_used,
        'latencyMs': latency_ms,
        'fallbackUsed': fallback_used,
    }
    audit_logs.insert(0, entry)
    
    # Notify subscribers
    for sub in list(subscribers):
        try:
            sub(entry)
        except Exception:
            pass

    return entry

def get_audit_logs(persona: str = None, module: str = None) -> list:
    res = audit_logs
    if persona and persona != 'ALL':
        res = [l for l in res if l['persona'] == persona]
    if module and module != 'ALL':
        res = [l for l in res if l['module'] == module]
    return res

def subscribe_audit(callback):
    subscribers.append(callback)
    def unsubscribe():
        if callback in subscribers:
            subscribers.remove(callback)
    return unsubscribe
