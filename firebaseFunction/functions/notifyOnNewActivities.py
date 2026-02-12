import os
from datetime import datetime
from zoneinfo import ZoneInfo
import logging
import firebase_admin
from firebase_admin import credentials, firestore, messaging

from firebase_functions import firestore_fn

ALERTS_LIMIT = 100
FCM_BATCH_SIZE = 100

logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)


def _init_firebase():
    if firebase_admin._apps:
        logger.debug("Firebase already initialized; skipping init.")
        return

    cred_path = (
        os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    )
    logger.info("Initializing Firebase app with explicit credentials: %s", bool(cred_path))
    if cred_path:
        firebase_admin.initialize_app(credentials.Certificate(cred_path))
    else:
        firebase_admin.initialize_app()
    logger.info("Firebase app initialized.")

def get_db():
    _init_firebase()
    return firestore.client()

def get_user_tokens_with_refs(user_id: str, db):
    """
    Retorna lista de (token, doc_ref) pra dar pra limpar token inválido depois.
    Espera tokens em: members/{userId}/fcmtokens/{docId}
    """
    tokens_ref = db.collection("members").document(user_id).collection("fcmtokens")
    docs = tokens_ref.stream()

    out = []
    possible_keys = ["fcmToken", "fcmtoken", "token", "FCMToken", "fcm_token"]

    logger.info("Fetching FCM tokens for user %s", user_id)
    for d in docs:
        data = d.to_dict() or {}
        token = None
        for k in possible_keys:
            if k in data and data[k]:
                token = data[k]
                break

        # fallback: token como ID do doc
        if not token and d.id and len(d.id) > 50:
            token = d.id

        if token:
            out.append((token, d.reference))

    logger.info("Found %d token(s) for user %s", len(out), user_id)
    return out

def _cleanup_bad_tokens(db, token_pairs, batch_response):
    """
    Remove tokens inválidos com base nas respostas do FCM.
    send_each_for_multicast preserva a ordem token->response.
    """
    to_delete = []
    logger.info(
        "Cleaning up tokens; received %d responses for %d sent tokens.",
        len(batch_response.responses),
        len(token_pairs),
    )
    for idx, r in enumerate(batch_response.responses):
        if r.success:
            continue
        exc = r.exception
        # "UnregisteredError" / "InvalidArgumentError" etc variam por versão,
        # então a checagem mais robusta é pelo tipo/nome.
        name = type(exc).__name__ if exc else ""
        if name in ("UnregisteredError", "InvalidArgumentError", "SenderIdMismatchError"):
            to_delete.append(token_pairs[idx][1])  # doc_ref

    logger.info("Found %d invalid token(s) to delete.", len(to_delete))
    for ref in to_delete:
        try:
            ref.delete()
            logger.debug("Deleted invalid token document %s", ref.path)
        except Exception:
            logger.exception("Failed to delete invalid token document %s", ref.path)
            
            
def _build_alert_key(project_id, activity_id, activity_name) -> str:
    project_part = str(project_id or "project-unknown")
    activity_source = activity_id if activity_id is not None else activity_name
    activity_part = str(activity_source or "activity-unknown").strip().lower()
    return f"{project_part}:{activity_part}"
            
def save_project_alert_if_missing(
    db,
    member_id: str | None,
    project_id: str | None,
    project_name: str,
    activity_id: str | None,
    activity_name: str,
    activity_priority: str | None,
    due_at,
) -> bool:
    """Save a project alert in members/{member_id}.alerts if it is not duplicated."""
    if not member_id:
        return False

    try:
        member_ref = db.collection("members").document(member_id)
        member_snapshot = member_ref.get()
        member_data = member_snapshot.to_dict() or {}
        current_alerts = member_data.get("alerts", [])

        if not isinstance(current_alerts, list):
            current_alerts = []

        dedupe_key = _build_alert_key(project_id, activity_id, activity_name)
        already_exists = any(
            isinstance(alert, dict) and alert.get("activityKey") == dedupe_key
            for alert in current_alerts
        )
        if already_exists:
            logger.log(f"ℹ️ Alerta já existe para {member_id}: {dedupe_key}")
            return False

        due_label = due_at.strftime("%d/%m/%Y") if due_at else "breve"
        now_sp = datetime.now(ZoneInfo("America/Sao_Paulo"))
        alert_payload = {
            "id": f"alert-{project_id or 'project'}-{activity_id or int(now_sp.timestamp())}",
            "title": f"Nova tarefa: {activity_name}",
            "detail": f"Tarefa '{activity_name}' atribuída a você no projeto {project_name} com prazo para {due_label}.",
            "time": now_sp.strftime("%d/%m/%Y %H:%M"),
            "level": activity_priority or "alto",
            "activityKey": dedupe_key,
            "projectId": project_id,
            "activityId": activity_id,
        }

        next_alerts = [alert_payload, *current_alerts][:ALERTS_LIMIT]
        member_ref.set({"alerts": next_alerts}, merge=True)
        logger.log(f"✅ Alerta salvo para {member_id}: {dedupe_key}")
        return True
    except Exception as exc:
        logger.error(f"❌ Erro salvando alerta para {member_id}: {exc}")
        return False


@firestore_fn.on_document_created(document="projects/{projectId}/activities/{activityID}")
def notify_owner_on_activity_created(event) -> None:
    db = get_db()

    snap = event.data
    if not snap:
        logger.warning("No snapshot data provided in event; aborting notification.")
        return

    activity = snap.to_dict() or {}

    project_id = event.params.get("projectId")
    logger.info(
        "Processing activity creation for project %s; activity payload keys: %s",
        project_id,
        list(activity.keys()),
    )
    project_doc = db.collection("projects").document(project_id).get()
    project_name = "desconhecido"
    if project_doc.exists:
        project_data = project_doc.to_dict() or {}
        project_name = project_data.get("name", project_name)
    activity_id = event.params.get("activityID")

    owner_id = activity.get("ownerId")

    if not owner_id:
        logger.warning(
            "Activity %s in project %s has no ownerId; skipping notification.",
            activity_id,
            project_id,
        )
        return
    
    token_pairs = get_user_tokens_with_refs(owner_id, db)
    tokens = [t for (t, _) in token_pairs]
    if not tokens:
        logger.info(
            "No tokens found for owner %s; notification for activity %s skipped.",
            owner_id,
            activity_id,
        )
        return

    title = "Nova tarefa atribuída"
    act_title = activity.get("title") or activity.get("name") or "nova atividade"
    body = f"A atividade '{act_title}' foi atribuída a você no projeto {project_name}."

    msg = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data={
            "type": "activity_created",
            "projectId": str(project_id or ""),
            "activityId": str(activity_id or ""),
        },
    )
    
    logger.info(
        "Sending multicast notification for activity %s to %d token(s).",
        activity_id,
        len(tokens),
    )
    
    
    resp = messaging.send_each_for_multicast(msg)
    alert = save_project_alert_if_missing(
        db,
        member_id=owner_id,
        project_id=project_id,
        project_name=project_name,
        activity_id=activity_id,
        activity_name=act_title,
        activity_priority=activity.get("priority", "alto"),
        due_at=activity.get("dueAt", None),
    )
    
    logger.info(
        "FCM multicast completed: %d success, %d failure.",
        resp.success_count,
        resp.failure_count,
    )
    _cleanup_bad_tokens(db, token_pairs, resp)
