import json
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def log_audit_action(
    db: Session,
    user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: str,
    details: dict | str | None = None
) -> AuditLog:
    details_str = json.dumps(details) if isinstance(details, dict) else (details or "")
    audit = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        details=details_str
    )
    db.add(audit)
    db.flush()
    return audit
