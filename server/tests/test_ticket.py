from uuid import uuid4

from app.core.hash import get_hash_service
from app.core.roles import ROLE_AGENT
from app.models.user.role import Role
from app.models.user.user import User
from sqlalchemy import select


def test_create_assign_me_and_patch_assignee(
    client,
    customer_headers,
    agent_headers,
    medium_priority_id,
    db_session,
):
    create = client.post(
        "/v1/ticket/",
        headers=customer_headers,
        json={
            "subject": "Falha no login",
            "description": "Não consigo entrar no sistema após resetar a senha.",
            "externalId": None,
            "attachments": [],
            "priorityId": str(medium_priority_id),
        },
    )
    assert create.status_code == 200, create.text
    ticket = create.json()
    ticket_id = ticket["id"]
    assert ticket["assigneeUserId"] is None

    assign_me = client.post(
        f"/v1/ticket/{ticket_id}/assign_me",
        headers=agent_headers,
    )
    assert assign_me.status_code == 200, assign_me.text
    assigned = assign_me.json()
    assert assigned["assigneeUserId"] == str(db_session.info["agent_id"])

    hasher = get_hash_service()
    agent_role = db_session.execute(
        select(Role).where(Role.name == ROLE_AGENT)
    ).scalars().first()
    other_agent = User(
        id=uuid4(),
        email="agent2@example.com",
        name="Agent Two",
        password=hasher.create_hash("TestPass123!"),
        role_id=agent_role.id,
        email_confirmed=True,
    )
    db_session.add(other_agent)
    db_session.commit()

    patch = client.patch(
        f"/v1/ticket/{ticket_id}",
        headers=agent_headers,
        json={"assigneeUserId": str(other_agent.id)},
    )
    assert patch.status_code == 200, patch.text
    assert patch.json()["assigneeUserId"] == str(other_agent.id)
