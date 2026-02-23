import os
import re
import smtplib
import ssl
import unicodedata
from email.message import EmailMessage
from typing import Any

from firebase_admin import firestore
from firebase_functions import firestore_fn, logger

from remake import get_db

EMAIL_FIELD_ALIASES = {
    "email",
    "e mail",
    "e-mail",
    "email para contato",
}

NAME_FIELD_ALIASES = {
    "nome",
    "primeiro nome",
    "nome completo",
}


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.strip().lower())
    without_accents = "".join(
        char for char in normalized if unicodedata.category(char) != "Mn"
    )
    sanitized = re.sub(r"[^a-z0-9\s-]", " ", without_accents)
    return re.sub(r"\s+", " ", sanitized).strip()


def find_answer_value(
    respostas: list[dict[str, Any]],
    aliases: set[str],
) -> str:
    normalized_aliases = {normalize_text(alias) for alias in aliases}

    for resposta in respostas:
        question_title = str(resposta.get("tituloPergunta", ""))
        value = resposta.get("valor")

        if not isinstance(value, str):
            continue

        normalized_title = normalize_text(question_title)
        if normalized_title in normalized_aliases:
            return value.strip()

    for resposta in respostas:
        question_title = str(resposta.get("tituloPergunta", ""))
        value = resposta.get("valor")

        if not isinstance(value, str):
            continue

        normalized_title = normalize_text(question_title)
        title_words = set(normalized_title.split())
        if any(
            (
                len(alias.split()) == 1
                and alias in title_words
            )
            or (
                len(alias.split()) > 1
                and alias in normalized_title
            )
            for alias in normalized_aliases
        ):
            return value.strip()

    return ""


def update_email_status(
    response_ref,
    status: str,
    to_email: str = "",
    error: str = "",
) -> None:
    payload: dict[str, Any] = {
        "status": status,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }

    if to_email:
        payload["to"] = to_email

    if status == "sent":
        payload["sentAt"] = firestore.SERVER_TIMESTAMP

    if status == "failed" and error:
        payload["error"] = error[:500]
        payload["failedAt"] = firestore.SERVER_TIMESTAMP

    response_ref.set({"emailConfirmacao": payload}, merge=True)


def build_email_body(candidate_name: str, form_name: str) -> tuple[str, str]:
    safe_name = candidate_name.strip() or "candidato(a)"
    safe_form_name = form_name.strip() or "Processo Seletivo"

    text_body = (
        f"Ola, {safe_name}.\n\n"
        f"Recebemos sua resposta no formulario \"{safe_form_name}\".\n"
        "Obrigado pelo interesse na Watt Consultoria.\n\n"
        "Caso voce tenha duvidas, responda este e-mail.\n\n"
        "Atenciosamente,\n"
        "Equipe Watt Consultoria"
    )

    html_body = f"""
    <p>Ola, <strong>{safe_name}</strong>.</p>
    <p>Recebemos sua resposta no formulario "<strong>{safe_form_name}</strong>".</p>
    <p>Obrigado pelo interesse na Watt Consultoria.</p>
    <p>Caso voce tenha duvidas, responda este e-mail.</p>
    <p>Atenciosamente,<br />Equipe Watt Consultoria</p>
    """

    return text_body, html_body


def send_smtp_email(to_email: str, candidate_name: str, form_name: str) -> None:
    smtp_host = os.getenv("PSEL_SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("PSEL_SMTP_PORT", "587"))
    smtp_username = os.getenv("PSEL_SMTP_USERNAME", "").strip()
    smtp_password = os.getenv("PSEL_SMTP_PASSWORD", "").strip()
    from_email = os.getenv("PSEL_EMAIL_FROM", smtp_username).strip()
    reply_to = os.getenv("PSEL_EMAIL_REPLY_TO", "").strip()
    subject = os.getenv(
        "PSEL_EMAIL_SUBJECT",
        "Confirmacao de inscricao - Processo Seletivo Watt",
    ).strip()
    timeout_seconds = int(os.getenv("PSEL_SMTP_TIMEOUT_SECONDS", "20"))
    use_ssl = os.getenv("PSEL_SMTP_USE_SSL", "").strip().lower() in {
        "1",
        "true",
        "yes",
    }

    if not smtp_host:
        raise RuntimeError("PSEL_SMTP_HOST nao configurado.")

    if not from_email:
        raise RuntimeError("PSEL_EMAIL_FROM ou PSEL_SMTP_USERNAME nao configurado.")

    text_body, html_body = build_email_body(candidate_name, form_name)

    message = EmailMessage()
    message["From"] = from_email
    message["To"] = to_email
    message["Subject"] = subject
    if reply_to:
        message["Reply-To"] = reply_to
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    if use_ssl or smtp_port == 465:
        with smtplib.SMTP_SSL(
            smtp_host,
            smtp_port,
            timeout=timeout_seconds,
            context=ssl.create_default_context(),
        ) as server:
            if smtp_username and smtp_password:
                server.login(smtp_username, smtp_password)
            server.send_message(message)
        return

    with smtplib.SMTP(smtp_host, smtp_port, timeout=timeout_seconds) as server:
        server.ehlo()
        server.starttls(context=ssl.create_default_context())
        server.ehlo()
        if smtp_username and smtp_password:
            server.login(smtp_username, smtp_password)
        server.send_message(message)


@firestore_fn.on_document_created(document="externForms/{formId}/respostas/{responseId}")
def send_psel_confirmation_email(
    event: firestore_fn.Event[firestore_fn.DocumentSnapshot | None],
) -> None:
    if event.data is None:
        logger.warning("Evento sem payload para envio de e-mail do PSEL.")
        return

    form_id = event.params.get("formId", "")
    response_id = event.params.get("responseId", "")

    if not form_id or not response_id:
        logger.warning("Evento sem formId/responseId para envio de e-mail do PSEL.")
        return

    db = get_db()
    response_ref = (
        db.collection("externForms")
        .document(form_id)
        .collection("respostas")
        .document(response_id)
    )

    response_data = event.data.to_dict() or {}
    respostas = response_data.get("respostas", [])
    if not isinstance(respostas, list):
        logger.warning(
            f"Resposta sem array de respostas. formId={form_id} responseId={response_id}"
        )
        update_email_status(response_ref, "failed", error="Formato invalido de respostas.")
        return

    form_snapshot = db.collection("externForms").document(form_id).get()
    if not form_snapshot.exists:
        logger.warning(f"Formulario nao encontrado. formId={form_id}")
        update_email_status(response_ref, "failed", error="Formulario nao encontrado.")
        return

    form_data = form_snapshot.to_dict() or {}
    if not bool(form_data.get("ehFormularioPsel", False)):
        return

    existing_email_status = (
        ((response_ref.get().to_dict() or {}).get("emailConfirmacao") or {}).get("status", "")
    )
    if str(existing_email_status).lower() == "sent":
        logger.info(
            f"E-mail ja enviado anteriormente. formId={form_id} responseId={response_id}"
        )
        return

    candidate_email = find_answer_value(respostas, EMAIL_FIELD_ALIASES)
    candidate_name = find_answer_value(respostas, NAME_FIELD_ALIASES) or "candidato(a)"
    form_name = str(form_data.get("nomeFormulario") or "Processo Seletivo Watt")

    if not candidate_email:
        logger.warning(
            f"E-mail do candidato nao encontrado. formId={form_id} responseId={response_id}"
        )
        update_email_status(response_ref, "failed", error="E-mail do candidato nao encontrado.")
        return

    update_email_status(response_ref, "processing", to_email=candidate_email)

    try:
        send_smtp_email(candidate_email, candidate_name, form_name)
        update_email_status(response_ref, "sent", to_email=candidate_email)
        logger.info(
            f"E-mail de confirmacao enviado. formId={form_id} "
            f"responseId={response_id} to={candidate_email}"
        )
    except Exception as exc:
        logger.error(
            f"Falha ao enviar e-mail de confirmacao. formId={form_id} "
            f"responseId={response_id} erro={exc}"
        )
        update_email_status(response_ref, "failed", to_email=candidate_email, error=str(exc))
