from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    get_current_user,
    get_current_group,
)
from app.db.models import User, Group, GroupMembers


def test_hash_and_verify_password():
    raw_password = "mysecretpassword"
    hashed = hash_password(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("wrong", hashed) is False


def test_create_and_decode_access_token():
    token = create_access_token(user_id=123)
    payload = decode_access_token(token)

    assert payload["sub"] == "123"


def test_decode_expired_access_token():
    expired_payload = {
        "sub": "1",
        "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
    }
    expired_token = jwt.encode(expired_payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(expired_token)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Token has expired"


def test_decode_invalid_access_token():
    with pytest.raises(HTTPException) as exc_info:
        decode_access_token("not-a-real-token")

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid token"


def test_get_current_user_success(db_session, auth_header):
    headers, user = auth_header
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=headers["Authorization"].split()[1])

    current_user = get_current_user(creds=creds, db=db_session)

    assert current_user.id == user.id
    assert current_user.email == user.email


def test_get_current_user_missing_user(db_session):
    token = create_access_token(user_id=999)
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(creds=creds, db=db_session)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "User not found / doesn't exist"


def test_get_current_user_invalid_payload(db_session):
    token = jwt.encode({"exp": datetime.now(timezone.utc) + timedelta(minutes=5)}, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(creds=creds, db=db_session)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid token payload"


def test_get_current_group_success(db_session, auth_header):
    headers, user = auth_header
    group = Group(name="Trip", pw="secret", emoji="😀")
    db_session.add(group)
    db_session.flush()

    membership = GroupMembers(user_id=user.id, group_id=group.id)
    db_session.add(membership)
    db_session.flush()

    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=headers["Authorization"].split()[1])
    current_user = get_current_user(creds=creds, db=db_session)

    context = get_current_group(group_id=group.id, db=db_session, current_user=current_user)

    assert context.group.id == group.id
    assert context.user.id == user.id


def test_get_current_group_forbidden(db_session, auth_header):
    headers, user = auth_header
    group = Group(name="Secret", pw="hidden", emoji=None)
    db_session.add(group)
    db_session.flush()

    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=headers["Authorization"].split()[1])
    current_user = get_current_user(creds=creds, db=db_session)

    with pytest.raises(HTTPException) as exc_info:
        get_current_group(group_id=group.id, db=db_session, current_user=current_user)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "User does not have access to this group"


def test_get_current_group_invalid_token(db_session):
    user = User(name="Orphan", email="nope@example.com", pw=hash_password("pwd"))
    db_session.add(user)
    db_session.flush()

    group = Group(name="OrphanGroup", pw="pw", emoji=None)
    db_session.add(group)
    db_session.flush()

    with pytest.raises(HTTPException):
        get_current_group(group_id=group.id, db=db_session, current_user=user)
