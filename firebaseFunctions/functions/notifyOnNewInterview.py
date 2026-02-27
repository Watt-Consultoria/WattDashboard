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


def _get_db():
    _init_firebase()
    return firestore.client()


def _get_user_tokens_with_refs(user_id: str, db):
    """
    Retorna lista de (token, doc_ref) para enviar notificações e limpar
    tokens inválidos depois.
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


def _save_interview_alert(
    db,
    member_id: str,
    slot_id: str,
    candidate_name: str,
    date_label: str,
    start_time: str,
    end_time: str,
) -> bool:
    """Salva um alerta de entrevista agendada em members/{member_id}.alerts."""
    if not member_id:
        return False

    try:
        member_ref = db.collection("members").document(member_id)
        member_snapshot = member_ref.get()
        member_data = member_snapshot.to_dict() or {}
        current_alerts = member_data.get("alerts", [])

        if not isinstance(current_alerts, list):
            current_alerts = []

        dedupe_key = f"interview-booked:{slot_id}"
        already_exists = any(
            isinstance(alert, dict) and alert.get("activityKey") == dedupe_key
            for alert in current_alerts
        )
        if already_exists:
            logger.info("Alerta de entrevista já existe para %s: %s", member_id, dedupe_key)
            return False

        now_sp = datetime.now(ZoneInfo("America/Sao_Paulo"))
        alert_payload = {
            "id": f"alert-interview-{slot_id}",
            "title": "Entrevista agendada",
            "detail": (
                f"{candidate_name} agendou uma entrevista com você para "
                f"{date_label} das {start_time} às {end_time}."
            ),
            "time": now_sp.strftime("%d/%m/%Y %H:%M"),
            "level": "medio",
            "activityKey": dedupe_key,
        }

        next_alerts = [alert_payload, *current_alerts][:ALERTS_LIMIT]
        member_ref.set({"alerts": next_alerts}, merge=True)
        logger.info("Alerta de entrevista salvo para %s: %s", member_id, dedupe_key)
        return True
    except Exception as exc:
        logger.error("Erro salvando alerta de entrevista para %s: %s", member_id, exc)
        return False


@firestore_fn.on_document_updated(
    document="externForms/{formId}/interviewSlots/{slotId}"
)
def notify_member_on_interview_booked(event) -> None:
    """
    Dispara quando um slot de entrevista é atualizado.
    Notifica o membro responsável se o status mudou para 'booked'.
    """
    db = _get_db()

    before = event.data.before
    after = event.data.after

    if not before or not after:
        logger.warning("Missing before/after snapshot data; aborting.")
        return

    before_data = before.to_dict() or {}
    after_data = after.to_dict() or {}

    old_status = before_data.get("status", "")
    new_status = after_data.get("status", "")

    # Só notifica quando status muda para 'booked'
    if old_status == "booked" or new_status != "booked":
        logger.debug(
            "Status transition %s → %s does not require notification; skipping.",
            old_status,
            new_status,
        )
        return

    slot_id = event.params.get("slotId", "")
    form_id = event.params.get("formId", "")
    responsible_member_id = after_data.get("responsibleMemberId", "")
    candidate_name = after_data.get("bookedByCandidateName", "Candidato")
    date_label = after_data.get("dateLabel", "")
    start_time = after_data.get("startTime", "")
    end_time = after_data.get("endTime", "")

    logger.info(
        "Interview slot %s in form %s booked by '%s'; responsible member: %s",
        slot_id,
        form_id,
        candidate_name,
        responsible_member_id,
    )

    if not responsible_member_id:
        logger.warning("No responsibleMemberId on slot %s; skipping notification.", slot_id)
        return

    # Buscar tokens FCM do membro responsável
    token_pairs = _get_user_tokens_with_refs(responsible_member_id, db)
    tokens = [t for (t, _) in token_pairs]

    if not tokens:
        logger.info(
            "No FCM tokens for member %s; saving alert only.", responsible_member_id
        )
        _save_interview_alert(
            db, responsible_member_id, slot_id,
            candidate_name, date_label, start_time, end_time,
        )
        return

    # Montar notificação push
    title = "Entrevista agendada"
    body = (
        f"{candidate_name} agendou uma entrevista com você para "
        f"{date_label} das {start_time} às {end_time}."
    )

    msg = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(title=title, body=body),
        data={
            "type": "interview_booked",
            "formId": str(form_id),
            "slotId": str(slot_id),
        },
    )

    logger.info(
        "Sending interview notification for slot %s to %d token(s).",
        slot_id,
        len(tokens),
    )

    resp = messaging.send_each_for_multicast(msg)

    # Salvar alerta no perfil do membro
    _save_interview_alert(
        db, responsible_member_id, slot_id,
        candidate_name, date_label, start_time, end_time,
    )

    logger.info(
        "FCM multicast completed: %d success, %d failure.",
        resp.success_count,
        resp.failure_count,
    )
    _cleanup_bad_tokens(db, token_pairs, resp)