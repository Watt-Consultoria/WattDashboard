from firebase_functions.firestore_fn import (
  on_document_created,
  on_document_deleted,
  on_document_updated,
  on_document_written,
  Event,
  Change,
  DocumentSnapshot,
)

def _init_firebase():
    if firebase_admin._apps:
        return

    # Production: use ADC. Dev/test: allow explicit service account path.
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
  
def get_user_tokens(user_id: str, db) -> list[str]:
    """Fetch user's FCM tokens from Firestore."""
    try:
        logger.log(f"🔍 Buscando tokens para usuário: {user_id}")
        tokens_ref = db.collection("members").document(user_id).collection("fcmtokens")
        tokens_docs = tokens_ref.stream()

        tokens = []
        for token_doc in tokens_docs:
            token_data = token_doc.to_dict() or {}
            fcm_token = None
            possible_keys = ["fcmToken", "fcmtoken", "token", "FCMToken", "fcm_token"]

            for key in possible_keys:
                if key in token_data:
                    fcm_token = token_data[key]
                    break

            # Fallback: token stored as document ID.
            if not fcm_token and token_doc.id and len(token_doc.id) > 50:
                fcm_token = token_doc.id

            if fcm_token:
                tokens.append(fcm_token)

        logger.log(f"✅ Encontrados {len(tokens)} tokens para {user_id}")
        return tokens
    except Exception as exc:
        logger.error(f"❌ Erro ao buscar tokens para {user_id}: {exc}")
        return []
      
@on_document_created("projects/{projectId}/Activities")