import os
import firebase_admin
from firebase_admin import credentials, firestore, messaging

from firebase_functions.firestore_fn import (
    on_document_created,
    Event,
    DocumentSnapshot,
)

# --- seus helpers (mantive a ideia) ---

def _init_firebase():
    if firebase_admin._apps:
        return

    cred_path = (
        os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    )
    if cred_path:
        firebase_admin.initialize_app(credentials.Certificate(cred_path))
    else:
        firebase_admin.initialize_app()

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

    return out

def _cleanup_bad_tokens(db, token_pairs, batch_response):
    """
    Remove tokens inválidos com base nas respostas do FCM.
    send_each_for_multicast preserva a ordem token->response.
    """
    to_delete = []
    for idx, r in enumerate(batch_response.responses):
        if r.success:
            continue
        exc = r.exception
        # "UnregisteredError" / "InvalidArgumentError" etc variam por versão,
        # então a checagem mais robusta é pelo tipo/nome.
        name = type(exc).__name__ if exc else ""
        if name in ("UnregisteredError", "InvalidArgumentError", "SenderIdMismatchError"):
            to_delete.append(token_pairs[idx][1])  # doc_ref

    for ref in to_delete:
        try:
            ref.delete()
        except Exception:
            pass

# --- A FUNÇÃO PRINCIPAL ---

@on_document_created(document="projects/{projectId}/activities/{activityID}")
def notify_owner_on_activity_created(event: Event[DocumentSnapshot]) -> None:
    db = get_db()

    snap = event.data
    if not snap:
        return

    activity = snap.to_dict() or {}

    project_id = event.params.get("projectId")
    activity_id = event.params.get("activityID")

    # 1) Descobre ownerId (tenta na activity, senão pega do projeto)
    owner_id = (
        activity.get("ownerId")
        or activity.get("owner_id")
        or activity.get("owner")
        or activity.get("createdBy")  # se você usar isso como owner
    )

    if not owner_id and project_id:
        proj_doc = db.collection("projects").document(project_id).get()
        if proj_doc.exists:
            proj = proj_doc.to_dict() or {}
            owner_id = proj.get("ownerId") or proj.get("owner_id") or proj.get("owner")

    if not owner_id:
        # Sem owner não tem pra quem notificar
        return

    # 2) Busca tokens do owner
    token_pairs = get_user_tokens_with_refs(owner_id, db)
    tokens = [t for (t, _) in token_pairs]
    if not tokens:
        return

    # 3) Monta a notificação
    title = "Nova atividade no seu projeto"
    # tenta usar algum campo "title/name" da activity
    act_title = activity.get("title") or activity.get("name") or "Uma nova atividade foi criada"
    body = act_title

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
        # Se teu front é web e você quer garantir notificação “bonita” no SW,
        # você pode adicionar webpush=messaging.WebpushConfig(...)
    )

    # 4) Envia (API recomendada)
    resp = messaging.send_each_for_multicast(msg)

    # 5) Limpa tokens inválidos (recomendado)
    _cleanup_bad_tokens(db, token_pairs, resp)
