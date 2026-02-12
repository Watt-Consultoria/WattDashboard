import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore, messaging

from firebase_functions import firestore_fn


logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)


# --- seus helpers (mantive a ideia) ---

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
    logger.info(
        "FCM multicast completed: %d success, %d failure.",
        resp.success_count,
        resp.failure_count,
    )
    _cleanup_bad_tokens(db, token_pairs, resp)
