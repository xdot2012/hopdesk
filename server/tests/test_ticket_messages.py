from uuid import UUID

from sqlalchemy import select

from app.models.ticket.ticket_message import TicketMessage


def _create_ticket(client, customer_headers, medium_priority_id) -> str:
    create = client.post(
        "/v1/ticket/",
        headers=customer_headers,
        json={
            "subject": "Mensagem de teste",
            "description": "Descrição inicial do chamado com texto suficiente.",
            "externalId": None,
            "attachments": [],
            "priorityId": str(medium_priority_id),
        },
    )
    assert create.status_code == 200, create.text
    return create.json()["id"]


def test_add_patch_delete_message(
    client,
    customer_headers,
    agent_headers,
    medium_priority_id,
    db_session,
):
    ticket_id = _create_ticket(client, customer_headers, medium_priority_id)

    add = client.post(
        f"/v1/ticket/{ticket_id}/messages",
        headers=agent_headers,
        json={
            "body": "<p>Primeira resposta do agente.</p>",
            "visibility": "public",
            "customerPending": False,
            "attachments": [],
        },
    )
    assert add.status_code == 200, add.text
    assert add.json().get("firstRespondedAt") is not None

    # Same DB session may keep a stale messages collection; resolve id from ORM.
    agent_id = db_session.info["agent_id"]
    db_session.expire_all()
    message = (
        db_session.execute(
            select(TicketMessage).where(
                TicketMessage.ticket_id == UUID(ticket_id),
                TicketMessage.author_user_id == agent_id,
            )
        )
        .scalars()
        .first()
    )
    assert message is not None
    message_id = str(message.id)

    patch = client.patch(
        f"/v1/ticket/{ticket_id}/messages/{message_id}",
        headers=agent_headers,
        json={"body": "<p>Resposta corrigida do agente.</p>"},
    )
    assert patch.status_code == 200, patch.text
    db_session.expire_all()
    refreshed = db_session.get(TicketMessage, message.id)
    assert refreshed is not None
    assert "corrigida" in (refreshed.body or "")

    delete = client.delete(
        f"/v1/ticket/{ticket_id}/messages/{message_id}",
        headers=agent_headers,
    )
    assert delete.status_code == 200, delete.text
    db_session.expire_all()
    assert db_session.get(TicketMessage, message.id) is None
