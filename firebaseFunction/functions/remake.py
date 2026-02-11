from datetime import datetime, timedelta
import os
from zoneinfo import ZoneInfo

import firebase_admin
from firebase_admin import credentials, firestore, messaging
from firebase_functions import scheduler_fn , logger

ALERTS_LIMIT = 100
FCM_BATCH_SIZE = 100


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
            "title": f"Projeto: {project_name}",
            "detail": f"Tarefa '{activity_name}' com prazo em {due_label}.",
            "time": now_sp.strftime("%d/%m/%Y %H:%M"),
            "level": "alto",
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


def alert_for_consultor_pending_tasks(
    owner_id: str,
    activity_name: str,
    project_name: str,
    tokens: list[str] | None = None,
    due_at=None,
):
    if not tokens:
        logger.warning(f"⚠️ Sem tokens para consultor {owner_id}")
        return

    try:
        logger.log(f"📱 Enviando alertas para consultor {owner_id} ({len(tokens)} tokens)")
        for i in range(0, len(tokens), FCM_BATCH_SIZE):
            token_chunk = tokens[i : i + FCM_BATCH_SIZE]

            message = messaging.MulticastMessage(
                tokens=token_chunk,
                notification=messaging.Notification(
                    title="Alerta de Tarefa Pendente",
                    body=(
                        f"A tarefa '{activity_name}' do projeto '{project_name}' vence em "
                        f"{due_at.strftime('%d/%m/%Y') if due_at else 'breve'}."
                    ),
                ),
                data={
                    "ownerId": owner_id,
                    "activityName": activity_name,
                    "projectName": project_name,
                    "timestamp": datetime.now(ZoneInfo("America/Sao_Paulo")).isoformat(),
                },
            )

            response = messaging.send_each_for_multicast(message)
            logger.log(
                f"✅ Notificações enviadas ao consultor: "
                f"{response.success_count} sucesso, {response.failure_count} falhas"
            )
            
            # Log de falhas individuais
            if response.failure_count > 0:
                for idx, resp in enumerate(response.responses):
                    if not resp.success:
                        logger.error(f"❌ Token {idx}: {resp.exception}")
    except Exception as exc:
        logger.error(f"❌ Erro enviando alertas ao consultor: {exc}")


def alert_for_manager_pending_tasks(
    manager_id: str,
    activity_name: str,
    project_name: str,
    tokens: list[str] | None = None,
    due_at=None,
):
    if not tokens:
        logger.warning(f"⚠️ Sem tokens para manager {manager_id}")
        return

    try:
        logger.log(f"👔 Enviando alertas para manager {manager_id} ({len(tokens)} tokens)")
        for i in range(0, len(tokens), FCM_BATCH_SIZE):
            token_chunk = tokens[i : i + FCM_BATCH_SIZE]

            message = messaging.MulticastMessage(
                tokens=token_chunk,
                notification=messaging.Notification(
                    title="Alerta de Tarefa Pendente",
                    body=(
                        f"A tarefa '{activity_name}' do projeto '{project_name}' vence em "
                        f"{due_at.strftime('%d/%m/%Y') if due_at else 'breve'}."
                    ),
                ),
                data={
                    "managerId": manager_id,
                    "activityName": activity_name,
                    "projectName": project_name,
                    "timestamp": datetime.now(ZoneInfo("America/Sao_Paulo")).isoformat(),
                },
            )

            response = messaging.send_multicast(message)
            logger.log(
                f"✅ Notificações enviadas ao manager: "
                f"{response.success_count} sucesso, {response.failure_count} falhas"
            )
            
            # Log de falhas individuais
            if response.failure_count > 0:
                for idx, resp in enumerate(response.responses):
                    if not resp.success:
                        logger.error(f"❌ Token {idx}: {resp.exception}")
    except Exception as exc:
        logger.error(f"❌ Erro enviando alertas ao manager: {exc}")


def analyze_tasks(project_id, project, db):
    """Analyze a single project and send alerts for pending tasks."""
    try:
        project_name = project.get("name", "Sem nome")
        logger.log(f"📊 Analisando projeto: {project_name}")
        
        activities = project.get("Activities", [])
        logger.log(f"   Total de atividades: {len(activities)}")
        
        now_brasilia = datetime.now(ZoneInfo("America/Sao_Paulo"))
        pending_count = 0

        for activity in activities:
            status = activity.get("status")
            due_at = activity.get("dueAt")

            if due_at and hasattr(due_at, "to_pydatetime"):
                due_at = due_at.to_pydatetime()

            if (
                status not in ("Concluido", "Cancelado")
                and due_at
                and due_at < (now_brasilia + timedelta(days=7))
            ):
                pending_count += 1
                owner_id = activity.get("ownerId")
                activity_name = activity.get("name")
                activity_id = activity.get("id")

                logger.log(f"⚠️ Tarefa pendente: '{activity_name}' vence em {due_at.strftime('%d/%m/%Y')}")

                save_project_alert_if_missing(
                    db=db,
                    member_id=owner_id,
                    project_id=project_id,
                    project_name=project_name,
                    activity_id=activity_id,
                    activity_name=activity_name,
                    due_at=due_at,
                )

                owner_tokens = get_user_tokens(owner_id, db)
                alert_for_consultor_pending_tasks(
                    owner_id, activity_name, project_name, owner_tokens, due_at
                )

                manager_id = project.get("managerId")
                if manager_id and manager_id != owner_id:
                    save_project_alert_if_missing(
                        db=db,
                        member_id=manager_id,
                        project_id=project_id,
                        project_name=project_name,
                        activity_id=activity_id,
                        activity_name=activity_name,
                        due_at=due_at,
                    )

                    manager_tokens = get_user_tokens(manager_id, db)
                    alert_for_manager_pending_tasks(
                        manager_id,
                        activity_name,
                        project_name,
                        manager_tokens,
                        due_at,
                    )
        
        logger.log(f"✅ Projeto '{project_name}': {pending_count} tarefas pendentes processadas")
        
    except Exception as exc:
        logger.error(f"❌ Erro analisando projeto: {exc}")


def run_pending_tasks_check():
    """Run pending task check for all projects."""
    try:
        logger.log("🚀 INICIANDO verificação de tarefas pendentes")
        db = get_db()
        logger.log("✅ Conexão com Firestore estabelecida v2")
        
        projects = db.collection("projects").stream()

        project_count = 0
        for project_doc in projects:
            project = project_doc.to_dict() or {}
            analyze_tasks(project_doc.id, project, db)
            project_count += 1

        logger.log(f"✅ CONCLUÍDO - {project_count} projetos analisados")
        return project_count
    except Exception as exc:
        logger.error(f"❌ ERRO na verificação de tarefas: {exc}")
        import traceback
        logger.error(f"Stack trace: {traceback.format_exc()}")
        raise


@scheduler_fn.on_schedule(
    schedule="every day 08:00",
    timezone="America/Sao_Paulo",
)
def check_pending_tasks(req: scheduler_fn.ScheduledEvent) -> None:
    """Daily scheduled check for pending tasks."""
    logger.log("=" * 70)
    logger.log("🕐 CHECK_PENDING_TASKS - NOVA VERSÃO")
    logger.log(f"⏰ Timestamp: {datetime.now(ZoneInfo('America/Sao_Paulo')).isoformat()}")
    logger.log("=" * 70)
    
    try:
        run_pending_tasks_check()
        logger.log("✅ Scheduled task completed successfully")
    except Exception as exc:
        logger.error(f"❌ ERRO CRÍTICO na scheduled task: {exc}")
        import traceback
        logger.error(f"Stack trace: {traceback.format_exc()}")
