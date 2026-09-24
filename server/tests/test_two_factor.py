"""Unit tests for two-factor code uniqueness."""

from __future__ import annotations

import datetime
from uuid import uuid4
from unittest.mock import patch

from app.models.user.two_factor import TwoFactor
from app.use_cases.auth.two_factor import (
    generate_unique_two_factor_code,
    get_active_two_factor_codes,
)


def test_get_active_two_factor_codes_returns_code_strings(db_session):
    now = datetime.datetime.now()
    active = TwoFactor(
        user_id=uuid4(),
        code="123456",
        expires_at=now + datetime.timedelta(minutes=10),
        created_at=now,
    )
    expired = TwoFactor(
        user_id=uuid4(),
        code="999999",
        expires_at=now - datetime.timedelta(minutes=1),
        created_at=now - datetime.timedelta(minutes=5),
    )
    db_session.add_all([active, expired])
    db_session.commit()

    codes = get_active_two_factor_codes(db_session)
    assert codes == {"123456"}
    assert "123456" in codes
    assert "999999" not in codes


def test_generate_unique_two_factor_code_avoids_active_collision(db_session):
    now = datetime.datetime.now()
    existing = TwoFactor(
        user_id=uuid4(),
        code="000001",
        expires_at=now + datetime.timedelta(minutes=10),
        created_at=now,
    )
    db_session.add(existing)
    db_session.commit()

    sequence = iter([1, 42])

    def fake_randint(_low: int, _high: int) -> int:
        return next(sequence)

    with patch("app.use_cases.auth.two_factor.random.randint", side_effect=fake_randint):
        code = generate_unique_two_factor_code(db_session)

    assert code == "000042"
    assert code != "000001"
