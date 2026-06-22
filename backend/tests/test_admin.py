import pytest
from uuid import uuid4
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone

from app.db.session import get_db
from app.dependencies import get_current_user, require_admin
from app.main import app
from app.models.user import User


def _make_admin_user():
    u = MagicMock(spec=User)
    u.id = uuid4()
    u.username = "admin"
    u.email = "admin@example.com"
    u.full_name = "Admin User"
    u.role = "admin"
    u.is_active = True
    u.created_at = datetime.now(timezone.utc)
    u.updated_at = datetime.now(timezone.utc)
    return u


def _make_doctor_user():
    u = MagicMock(spec=User)
    u.id = uuid4()
    u.username = "bsnguyenvana"
    u.email = "bsnguyenvana@hospital.vn"
    u.full_name = "BS. Nguyễn Văn A"
    u.role = "doctor"
    u.is_active = True
    u.created_at = datetime.now(timezone.utc)
    u.updated_at = datetime.now(timezone.utc)
    return u


def _override_admin(admin_user):
    async def override():
        return admin_user
    app.dependency_overrides[require_admin] = override
    app.dependency_overrides[get_current_user] = override


def _override_db_with_users(users: list):
    async def override_get_db():
        mock_session = MagicMock()

        async def mock_execute(query):
            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = users
            mock_result.scalars.return_value.first.return_value = users[0] if users else None
            mock_result.scalar.return_value = len(users)
            return mock_result

        async def mock_commit():
            pass

        async def mock_refresh(obj):
            if not hasattr(obj, "id") or obj.id is None:
                obj.id = uuid4()
            if not hasattr(obj, "is_active") or obj.is_active is None:
                obj.is_active = True
            obj.created_at = datetime.now(timezone.utc)
            obj.updated_at = datetime.now(timezone.utc)

        async def mock_delete(obj):
            pass

        mock_session.execute = mock_execute
        mock_session.commit = mock_commit
        mock_session.refresh = mock_refresh
        mock_session.delete = mock_delete
        mock_session.add = MagicMock()
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db


def _clear():
    app.dependency_overrides.clear()


# ─────────────────────────── GET /admin/users ────────────────────────────────

@pytest.mark.asyncio
async def test_list_users_returns_200(client):
    admin = _make_admin_user()
    doctor = _make_doctor_user()
    _override_admin(admin)
    _override_db_with_users([admin, doctor])

    response = await client.get("/api/admin/users")
    _clear()
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_list_users_returns_list(client):
    admin = _make_admin_user()
    _override_admin(admin)
    _override_db_with_users([admin])

    response = await client.get("/api/admin/users")
    _clear()
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_list_users_non_admin_returns_403(client):
    doctor = _make_doctor_user()

    async def override_non_admin():
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    app.dependency_overrides[require_admin] = override_non_admin
    response = await client.get("/api/admin/users")
    _clear()
    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access required"


@pytest.mark.asyncio
async def test_list_users_no_token_returns_401(client):
    response = await client.get("/api/admin/users")
    assert response.status_code == 401


# ─────────────────────────── POST /admin/users ───────────────────────────────

CREATE_PAYLOAD = {
    "username": "newdoctor",
    "email": "newdoctor@hospital.vn",
    "password": "SecurePass123",
    "full_name": "BS. Mới",
    "role": "doctor",
}


@pytest.mark.asyncio
async def test_create_user_returns_201(client):
    admin = _make_admin_user()
    new_user = _make_doctor_user()
    new_user.username = CREATE_PAYLOAD["username"]
    new_user.email = CREATE_PAYLOAD["email"]
    new_user.full_name = CREATE_PAYLOAD["full_name"]
    new_user.role = CREATE_PAYLOAD["role"]

    _override_admin(admin)
    _override_db_with_users([new_user])

    with patch("app.api.admin.pwd_context.hash", return_value="hashed"):
        response = await client.post("/api/admin/users", json=CREATE_PAYLOAD)
    _clear()
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_create_user_response_has_required_fields(client):
    admin = _make_admin_user()
    new_user = _make_doctor_user()
    _override_admin(admin)
    _override_db_with_users([new_user])

    with patch("app.api.admin.pwd_context.hash", return_value="hashed"):
        response = await client.post("/api/admin/users", json=CREATE_PAYLOAD)
    _clear()
    data = response.json()
    for field in ("id", "username", "email", "full_name", "role", "is_active", "created_at", "updated_at"):
        assert field in data


@pytest.mark.asyncio
async def test_create_user_missing_username_returns_422(client):
    admin = _make_admin_user()
    _override_admin(admin)
    payload = {k: v for k, v in CREATE_PAYLOAD.items() if k != "username"}
    response = await client.post("/api/admin/users", json=payload)
    _clear()
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_user_missing_password_returns_422(client):
    admin = _make_admin_user()
    _override_admin(admin)
    payload = {k: v for k, v in CREATE_PAYLOAD.items() if k != "password"}
    response = await client.post("/api/admin/users", json=payload)
    _clear()
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_user_non_admin_returns_403(client):
    async def override_non_admin():
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    app.dependency_overrides[require_admin] = override_non_admin
    response = await client.post("/api/admin/users", json=CREATE_PAYLOAD)
    _clear()
    assert response.status_code == 403


# ─────────────────────────── PATCH /admin/users/{id} ─────────────────────────

@pytest.mark.asyncio
async def test_update_user_role_returns_200(client):
    admin = _make_admin_user()
    target = _make_doctor_user()
    _override_admin(admin)

    async def override_get_db():
        mock_session = MagicMock()

        async def mock_execute(query):
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = target
            return mock_result

        async def mock_commit():
            pass

        async def mock_refresh(obj):
            pass

        mock_session.execute = mock_execute
        mock_session.commit = mock_commit
        mock_session.refresh = mock_refresh
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    response = await client.patch(f"/api/admin/users/{target.id}", json={"role": "researcher"})
    _clear()
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_user_not_found_returns_404(client):
    admin = _make_admin_user()
    _override_admin(admin)

    async def override_get_db():
        mock_session = MagicMock()

        async def mock_execute(query):
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = None
            return mock_result

        mock_session.execute = mock_execute
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    response = await client.patch(f"/api/admin/users/{uuid4()}", json={"role": "researcher"})
    _clear()
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


@pytest.mark.asyncio
async def test_update_user_is_active_false_returns_200(client):
    admin = _make_admin_user()
    target = _make_doctor_user()
    _override_admin(admin)

    async def override_get_db():
        mock_session = MagicMock()

        async def mock_execute(query):
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = target
            return mock_result

        async def mock_commit():
            pass

        async def mock_refresh(obj):
            pass

        mock_session.execute = mock_execute
        mock_session.commit = mock_commit
        mock_session.refresh = mock_refresh
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    response = await client.patch(f"/api/admin/users/{target.id}", json={"is_active": False})
    _clear()
    assert response.status_code == 200


# ─────────────────────────── DELETE /admin/users/{id} ────────────────────────

@pytest.mark.asyncio
async def test_delete_user_returns_204(client):
    admin = _make_admin_user()
    target = _make_doctor_user()
    _override_admin(admin)

    async def override_get_db():
        mock_session = MagicMock()

        async def mock_execute(query):
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = target
            return mock_result

        async def mock_delete(obj):
            pass

        async def mock_commit():
            pass

        mock_session.execute = mock_execute
        mock_session.delete = mock_delete
        mock_session.commit = mock_commit
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    response = await client.delete(f"/api/admin/users/{target.id}")
    _clear()
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_user_not_found_returns_404(client):
    admin = _make_admin_user()
    _override_admin(admin)

    async def override_get_db():
        mock_session = MagicMock()

        async def mock_execute(query):
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = None
            return mock_result

        mock_session.execute = mock_execute
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    response = await client.delete(f"/api/admin/users/{uuid4()}")
    _clear()
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


@pytest.mark.asyncio
async def test_delete_user_invalid_uuid_returns_422(client):
    admin = _make_admin_user()
    _override_admin(admin)
    response = await client.delete("/api/admin/users/not-a-uuid")
    _clear()
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_delete_user_non_admin_returns_403(client):
    async def override_non_admin():
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    app.dependency_overrides[require_admin] = override_non_admin
    response = await client.delete(f"/api/admin/users/{uuid4()}")
    _clear()
    assert response.status_code == 403


# ─────────────────────────── GET /admin/stats ────────────────────────────────

@pytest.mark.asyncio
async def test_get_stats_returns_200(client):
    admin = _make_admin_user()
    _override_admin(admin)

    async def override_get_db():
        mock_session = MagicMock()
        call_count = 0

        async def mock_execute(query):
            nonlocal call_count
            call_count += 1
            mock_result = MagicMock()
            if call_count == 1:
                mock_result.scalar.return_value = 5
            else:
                mock_result.all.return_value = [("admin", 1), ("doctor", 3), ("nurse", 1)]
            return mock_result

        mock_session.execute = mock_execute
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    response = await client.get("/api/admin/stats")
    _clear()
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_stats_has_required_fields(client):
    admin = _make_admin_user()
    _override_admin(admin)

    async def override_get_db():
        mock_session = MagicMock()
        call_count = 0

        async def mock_execute(query):
            nonlocal call_count
            call_count += 1
            mock_result = MagicMock()
            if call_count == 1:
                mock_result.scalar.return_value = 5
            else:
                mock_result.all.return_value = [("admin", 1), ("doctor", 3)]
            return mock_result

        mock_session.execute = mock_execute
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    response = await client.get("/api/admin/stats")
    _clear()
    data = response.json()
    assert "total_users" in data
    assert "users_by_role" in data
    assert isinstance(data["users_by_role"], dict)


@pytest.mark.asyncio
async def test_get_stats_non_admin_returns_403(client):
    async def override_non_admin():
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    app.dependency_overrides[require_admin] = override_non_admin
    response = await client.get("/api/admin/stats")
    _clear()
    assert response.status_code == 403
