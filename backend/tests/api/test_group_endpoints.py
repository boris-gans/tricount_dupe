from datetime import datetime, timedelta, timezone

import pytest

from app.db.models import Group, GroupMembers, User, GroupInvite
from app.core.exceptions import (
    GroupFullDetailsError,
    GroupNotFoundError,
    GroupAddUserError,
    GroupCheckPwJoinError,
    GroupCheckLinkJoinError,
    GroupInviteLinkCreateError,
)
from app.services.expense_service import create_expense_service
from app.db.schemas import ExpenseCreate, ExpenseSplitIn, UserIn
from app.core.security import create_access_token, hash_password


def _create_user(db_session, name: str, email: str) -> User:
    user = User(name=name, email=email, pw=hash_password("password"))
    db_session.add(user)
    db_session.flush()
    return user


def _auth_headers_for_user(user: User) -> dict[str, str]:
    token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}


def _ensure_membership(db_session, group: Group, user: User) -> None:
    membership = GroupMembers(user_id=user.id, group_id=group.id)
    db_session.add(membership)
    db_session.flush()


def test_create_group_success(client, db_session, auth_header):
    headers, user = auth_header
    response = client.post(
        "/groups/create",
        headers=headers,
        json={"name": "Ski Trip", "group_pw": "pw123", "emoji": "🎿"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Ski Trip"
    assert len(body["members"]) == 1

    membership = db_session.query(GroupMembers).filter_by(user_id=user.id).first()
    assert membership is not None


def test_create_group_full_details_failure(client, auth_header, monkeypatch):
    headers, _ = auth_header

    def broken_group_details(*args, **kwargs):
        raise GroupFullDetailsError

    monkeypatch.setattr("app.api.groups.get_full_group_details", broken_group_details)

    response = client.post(
        "/groups/create",
        headers=headers,
        json={"name": "Bad Group", "group_pw": "pw", "emoji": None},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Error polling db for group details"


def test_create_group_not_found(client, auth_header, monkeypatch):
    headers, _ = auth_header

    def not_found(*args, **kwargs):
        raise GroupNotFoundError

    monkeypatch.setattr("app.api.groups.get_full_group_details", not_found)

    response = client.post(
        "/groups/create",
        headers=headers,
        json={"name": "Missing", "group_pw": "pw", "emoji": None},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Group not found"


def test_join_group_with_password_success(client, db_session, auth_header):
    headers, user = auth_header
    group = Group(name="Road Trip", pw="secure", emoji=None)
    db_session.add(group)
    db_session.flush()

    response = client.post(
        "/groups/join",
        headers=headers,
        json={"pw_auth": {"group_name": "Road Trip", "group_pw": "secure"}},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == group.id
    assert any(member["id"] == user.id for member in body["members"])


def test_join_group_with_link_success(client, db_session, auth_header):
    headers, joiner = auth_header
    creator = _create_user(db_session, "Creator", "creator@example.com")
    group = Group(name="Board Games", pw="invite", emoji=None)
    db_session.add(group)
    db_session.flush()

    _ensure_membership(db_session, group, creator)

    invite = GroupInvite(
        group_id=group.id,
        created_by_id=creator.id,
        token="token123",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db_session.add(invite)
    db_session.flush()

    response = client.post(
        "/groups/join",
        headers=headers,
        json={"link_auth": "https://example.com/join?token=token123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == group.id
    assert any(member["id"] == joiner.id for member in body["members"])


def test_join_group_add_user_failure(client, auth_header, monkeypatch):
    headers, _ = auth_header

    monkeypatch.setattr("app.api.groups.check_join_group", lambda **_: 1)

    def broken_add_user(*args, **kwargs):
        raise GroupAddUserError

    monkeypatch.setattr("app.api.groups.add_user_group", broken_add_user)

    response = client.post(
        "/groups/join",
        headers=headers,
        json={"pw_auth": {"group_name": "Any", "group_pw": "pw"}},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Error adding user to group relationship"


def test_join_group_invalid_password(client, auth_header, monkeypatch):
    headers, _ = auth_header

    def bad_pw(*args, **kwargs):
        raise GroupCheckPwJoinError

    monkeypatch.setattr("app.api.groups.check_join_group", bad_pw)

    response = client.post(
        "/groups/join",
        headers=headers,
        json={"pw_auth": {"group_name": "Road Trip", "group_pw": "wrong"}},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect password or name"


def test_join_group_invalid_link(client, auth_header, monkeypatch):
    headers, _ = auth_header

    def bad_link(*args, **kwargs):
        raise GroupCheckLinkJoinError

    monkeypatch.setattr("app.api.groups.check_link_join", bad_link)

    response = client.post(
        "/groups/join",
        headers=headers,
        json={"link_auth": "https://example.com/join?token=bad"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invite link has already been used or is expired. Request another"


def test_view_all_groups_success(client, db_session):
    user = _create_user(db_session, "Viewer", "viewer@example.com")
    other = _create_user(db_session, "Buddy", "buddy@example.com")

    group1 = Group(name="Group1", pw="pw1", emoji=None)
    group2 = Group(name="Group2", pw="pw2", emoji=None)
    db_session.add_all([group1, group2])
    db_session.flush()

    _ensure_membership(db_session, group1, user)
    _ensure_membership(db_session, group2, user)
    _ensure_membership(db_session, group2, other)

    headers = _auth_headers_for_user(user)

    response = client.get("/groups/view-short", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2


def test_view_all_groups_failure(client, auth_header, monkeypatch):
    headers, _ = auth_header

    def broken_short(*args, **kwargs):
        raise GroupFullDetailsError

    monkeypatch.setattr("app.api.groups.get_short_group_details", broken_short)

    response = client.get("/groups/view-short", headers=headers)

    assert response.status_code == 500


def test_view_group_success(client, db_session):
    user = _create_user(db_session, "Explorer", "explorer@example.com")
    group = Group(name="Adventure", pw="pw", emoji=None)
    db_session.add(group)
    db_session.flush()

    _ensure_membership(db_session, group, user)

    # Add expense for richer payload
    payer = user
    friend = _create_user(db_session, "Friend", "friend@example.com")
    _ensure_membership(db_session, group, friend)

    expense_payload = ExpenseCreate(
        paid_by_id=payer.id,
        amount=50.0,
        description="Dinner",
        splits=[
            ExpenseSplitIn(user=UserIn(id=payer.id, name=payer.name), amount=25.0),
            ExpenseSplitIn(user=UserIn(id=friend.id, name=friend.name), amount=25.0),
        ],
    )
    create_expense_service(new_expense=expense_payload, user_id=payer.id, group_id=group.id, db=db_session)

    headers = _auth_headers_for_user(user)

    response = client.get(f"/groups/{group.id}", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == group.id
    assert len(body["members"]) == 2
    assert len(body["expenses"]) == 1


def test_view_group_failure(client, auth_header, monkeypatch):
    headers, _ = auth_header

    monkeypatch.setattr("app.api.groups.get_current_group", lambda group_id, db, current_user: (_ for _ in ()).throw(GroupNotFoundError))

    response = client.get("/groups/1", headers=headers)

    assert response.status_code == 403
    # This test was initially 404 but that doesnt make sense. For my /groups/{group_id} endpoint I use my get_current_group dependency (ctx). 
    # This ensures the endpoint doesnt even get called if the user isnt a member, and therefore I return a 403 (forbidden) response


def test_view_group_full_details_failure(client, db_session, auth_header, monkeypatch):
    headers, user = auth_header
    group = Group(name="Failure", pw="pw", emoji=None)
    db_session.add(group)
    db_session.flush()
    _ensure_membership(db_session, group, user)

    def boom(*args, **kwargs):
        raise GroupFullDetailsError

    monkeypatch.setattr("app.api.groups.get_full_group_details", boom)

    response = client.get(f"/groups/{group.id}", headers=headers)

    assert response.status_code == 500


def test_create_group_invite_success(client, db_session):
    user = _create_user(db_session, "Sharer", "sharer@example.com")
    group = Group(name="Share", pw="pw", emoji=None)
    db_session.add(group)
    db_session.flush()
    _ensure_membership(db_session, group, user)

    headers = _auth_headers_for_user(user)

    response = client.get(f"/groups/{group.id}/create-invite", headers=headers)

    assert response.status_code == 200
    assert "token" in response.json()


def test_create_group_invite_failure(client, db_session, auth_header, monkeypatch):
    headers, user = auth_header
    group = Group(name="InviteFail", pw="pw", emoji=None)
    db_session.add(group)
    db_session.flush()
    _ensure_membership(db_session, group, user)

    def boom(*args, **kwargs):
        raise GroupInviteLinkCreateError

    monkeypatch.setattr("app.api.groups.create_group_invite_service", boom)

    response = client.get(f"/groups/{group.id}/create-invite", headers=headers)

    assert response.status_code == 500
    assert response.json()["detail"] == "Error creating group invite"
