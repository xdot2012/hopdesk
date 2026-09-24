from uuid import uuid4

from app.core.hash import get_hash_service
from app.core.roles import ROLE_CUSTOMER
from app.models.user.role import Role
from app.models.user.user import User
from sqlalchemy import select


def test_list_and_delete_user_sector(client, admin_headers, db_session):
    listed = client.get("/v1/user_sector/", headers=admin_headers)
    assert listed.status_code == 200, listed.text
    rows = listed.json()
    assert len(rows) >= 1
    existing_ids = {row["id"] for row in rows}

    hasher = get_hash_service()
    role = db_session.execute(
        select(Role).where(Role.name == ROLE_CUSTOMER)
    ).scalars().first()
    orphan = User(
        id=uuid4(),
        email="orphan-customer@example.com",
        name="Orphan Customer",
        password=hasher.create_hash("TestPass123!"),
        role_id=role.id,
        email_confirmed=True,
    )
    db_session.add(orphan)
    db_session.commit()

    added = client.post(
        "/v1/user_sector/",
        headers=admin_headers,
        json={"userId": str(orphan.id)},
    )
    assert added.status_code == 200, added.text
    user_sector_id = added.json()["id"]
    assert user_sector_id not in existing_ids

    deleted = client.delete(
        f"/v1/user_sector/{user_sector_id}",
        headers=admin_headers,
    )
    assert deleted.status_code == 204, deleted.text

    after = client.get("/v1/user_sector/", headers=admin_headers)
    assert user_sector_id not in {row["id"] for row in after.json()}


def test_delete_user_sector_not_found(client, admin_headers):
    response = client.delete(
        f"/v1/user_sector/{uuid4()}",
        headers=admin_headers,
    )
    assert response.status_code == 404
