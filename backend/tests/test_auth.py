import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.db.session import get_db
from app.main import app


def _make_mock_user(username="admin", password_hash="hashed_password", role="admin"):
    user = MagicMock()
    user.id = uuid4()
    user.username = username
    user.password_hash = password_hash
    user.role = role
    return user


def _make_db_override(user):
    async def override_get_db():
        mock_session = MagicMock()

        async def mock_execute(query):
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = user
            return mock_result

        mock_session.execute = mock_execute
        yield mock_session

    return override_get_db


@pytest.mark.asyncio
async def test_login_correct_credentials_returns_200(client):
    mock_user = _make_mock_user()
    app.dependency_overrides[get_db] = _make_db_override(mock_user)

    with patch("app.api.auth.pwd_context.verify", return_value=True):
        response = await client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "correct_password"},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_login_correct_credentials_returns_access_token(client):
    mock_user = _make_mock_user()
    app.dependency_overrides[get_db] = _make_db_override(mock_user)

    with patch("app.api.auth.pwd_context.verify", return_value=True):
        response = await client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "correct_password"},
        )

    app.dependency_overrides.clear()
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_access_token_is_non_empty_string(client):
    mock_user = _make_mock_user()
    app.dependency_overrides[get_db] = _make_db_override(mock_user)

    with patch("app.api.auth.pwd_context.verify", return_value=True):
        response = await client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "correct_password"},
        )

    app.dependency_overrides.clear()
    assert isinstance(response.json()["access_token"], str)
    assert len(response.json()["access_token"]) > 0


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client):
    mock_user = _make_mock_user()
    app.dependency_overrides[get_db] = _make_db_override(mock_user)

    with patch("app.api.auth.pwd_context.verify", return_value=False):
        response = await client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "wrong_password"},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_wrong_password_returns_correct_error_detail(client):
    mock_user = _make_mock_user()
    app.dependency_overrides[get_db] = _make_db_override(mock_user)

    with patch("app.api.auth.pwd_context.verify", return_value=False):
        response = await client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "wrong_password"},
        )

    app.dependency_overrides.clear()
    assert response.json()["detail"] == "Incorrect username or password"


@pytest.mark.asyncio
async def test_login_unknown_username_returns_401(client):
    app.dependency_overrides[get_db] = _make_db_override(user=None)

    response = await client.post(
        "/api/auth/login",
        data={"username": "unknown_user", "password": "any_password"},
    )

    app.dependency_overrides.clear()
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_username_returns_correct_error_detail(client):
    app.dependency_overrides[get_db] = _make_db_override(user=None)

    response = await client.post(
        "/api/auth/login",
        data={"username": "unknown_user", "password": "any_password"},
    )

    app.dependency_overrides.clear()
    assert response.json()["detail"] == "Incorrect username or password"


@pytest.mark.asyncio
async def test_login_missing_username_returns_422(client):
    response = await client.post(
        "/api/auth/login",
        data={"password": "some_password"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_missing_password_returns_422(client):
    response = await client.post(
        "/api/auth/login",
        data={"username": "admin"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_empty_body_returns_422(client):
    response = await client.post("/api/auth/login", data={})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_response_includes_www_authenticate_header_on_failure(client):
    app.dependency_overrides[get_db] = _make_db_override(user=None)

    response = await client.post(
        "/api/auth/login",
        data={"username": "unknown", "password": "wrong"},
    )

    app.dependency_overrides.clear()
    assert response.headers.get("www-authenticate") == "Bearer"
