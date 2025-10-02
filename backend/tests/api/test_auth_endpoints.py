import pytest

from app.core.security import hash_password
from app.db.models import User
from app.core.exceptions import AuthJwtCreationError, AuthCredentialsError


def test_signup_success(client, db_session):
    response = client.post(
        "/auth/signup",
        json={"name": "Test", "email": "signup@example.com", "pw": "pass123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["user"]["email"] == "signup@example.com"

    user = db_session.query(User).filter(User.email == "signup@example.com").first()
    assert user is not None


def test_signup_invalid_credentials(client, monkeypatch):
    def broken_hash(_):
        raise AuthCredentialsError

    monkeypatch.setattr("app.api.auth.hash_password", broken_hash)

    response = client.post(
        "/auth/signup",
        json={"name": "Test", "email": "signup-fail@example.com", "pw": "pass123"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid email or password"


def test_signup_token_failure(client, monkeypatch):
    monkeypatch.setattr("app.api.auth.create_access_token", lambda **_: (_ for _ in ()).throw(AuthJwtCreationError()))

    response = client.post(
        "/auth/signup",
        json={"name": "Test", "email": "signup-token@example.com", "pw": "pass123"},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Error creating user token"


def test_login_success(client, db_session):
    password = hash_password("secret")
    user = User(name="Login", email="login@example.com", pw=password)
    db_session.add(user)
    db_session.flush()

    response = client.post(
        "/auth/login",
        json={"email": "login@example.com", "pw": "secret"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["user"]["id"] == user.id


def test_login_invalid_credentials(client, db_session):
    password = hash_password("secret")
    user = User(name="LoginFail", email="loginfail@example.com", pw=password)
    db_session.add(user)
    db_session.flush()

    response = client.post(
        "/auth/login",
        json={"email": "loginfail@example.com", "pw": "wrong"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid email or password"


def test_login_token_failure(client, db_session, monkeypatch):
    password = hash_password("secret")
    user = User(name="LoginToken", email="logintoken@example.com", pw=password)
    db_session.add(user)
    db_session.flush()

    monkeypatch.setattr("app.api.auth.create_access_token", lambda **_: (_ for _ in ()).throw(AuthJwtCreationError()))

    response = client.post(
        "/auth/login",
        json={"email": "logintoken@example.com", "pw": "secret"},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Error creating user token"
