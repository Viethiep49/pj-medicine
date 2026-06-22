import pytest
from uuid import uuid4
from unittest.mock import MagicMock, AsyncMock, patch

from app.models.patient import Patient

PATIENT_PAYLOAD = {
    "full_name": "Nguyễn Văn A",
    "date_of_birth": "1990-01-15",
    "gender": "male",
}


@pytest.mark.asyncio
async def test_create_patient_returns_201(client):
    response = await client.post("/api/v1/patients", json=PATIENT_PAYLOAD)
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_create_patient_response_has_required_fields(client):
    response = await client.post("/api/v1/patients", json=PATIENT_PAYLOAD)
    data = response.json()
    assert "id" in data
    assert "patient_code" in data
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_create_patient_stores_provided_fields(client):
    response = await client.post("/api/v1/patients", json=PATIENT_PAYLOAD)
    data = response.json()
    assert data["full_name"] == PATIENT_PAYLOAD["full_name"]
    assert data["gender"] == PATIENT_PAYLOAD["gender"]


@pytest.mark.asyncio
async def test_create_patient_with_optional_fields(client):
    payload = {
        **PATIENT_PAYLOAD,
        "phone": "0901234567",
        "address": "Hà Nội",
        "blood_type": "O+",
        "allergies": ["penicillin"],
        "chronic_diseases": ["hypertension"],
    }
    response = await client.post("/api/v1/patients", json=payload)
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_create_patient_missing_required_field_returns_422(client):
    payload = {"full_name": "Nguyễn Văn A", "gender": "male"}
    response = await client.post("/api/v1/patients", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_patients_returns_200(client):
    response = await client.get("/api/v1/patients")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_list_patients_returns_list(client):
    response = await client.get("/api/v1/patients")
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_list_patients_skip_and_limit_params_accepted(client):
    response = await client.get("/api/v1/patients?skip=0&limit=10")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_list_patients_invalid_limit_returns_422(client):
    response = await client.get("/api/v1/patients?limit=0")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_patient_by_id_returns_200(client):
    from app.db.session import get_db
    from app.main import app
    from datetime import datetime, timezone, date as date_type

    async def override():
        mock_session = MagicMock()

        async def mock_get(model, id):
            p = MagicMock()
            p.id = id
            p.patient_code = "BN-ABCD1234"
            p.full_name = "Nguyễn Văn A"
            p.date_of_birth = date_type(1990, 1, 15)
            p.gender = "male"
            p.phone = None
            p.address = None
            p.blood_type = None
            p.allergies = []
            p.chronic_diseases = []
            p.created_at = datetime.now(timezone.utc)
            p.updated_at = datetime.now(timezone.utc)
            return p

        mock_session.get = mock_get
        yield mock_session

    app.dependency_overrides[get_db] = override
    patient_id = uuid4()
    response = await client.get(f"/api/v1/patients/{patient_id}")
    app.dependency_overrides.clear()
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_patient_by_id_not_found_returns_404(client):
    from app.db.session import get_db

    async def override_get_db_none():
        mock_session = MagicMock()

        async def mock_get(model, id):
            return None

        mock_session.get = mock_get
        yield mock_session

    from app.main import app

    app.dependency_overrides[get_db] = override_get_db_none
    patient_id = uuid4()
    response = await client.get(f"/api/v1/patients/{patient_id}")
    app.dependency_overrides.clear()
    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not found"


@pytest.mark.asyncio
async def test_get_patient_by_id_invalid_uuid_returns_422(client):
    response = await client.get("/api/v1/patients/not-a-uuid")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_patient_by_code_returns_200(client):
    from app.db.session import get_db
    from app.main import app
    from datetime import datetime, timezone, date as date_type

    async def override():
        mock_session = MagicMock()

        async def mock_execute(query):
            p = MagicMock()
            p.id = uuid4()
            p.patient_code = "BN-ABCD1234"
            p.full_name = "Nguyễn Văn A"
            p.date_of_birth = date_type(1990, 1, 15)
            p.gender = "male"
            p.phone = None
            p.address = None
            p.blood_type = None
            p.allergies = []
            p.chronic_diseases = []
            p.created_at = datetime.now(timezone.utc)
            p.updated_at = datetime.now(timezone.utc)
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = p
            return mock_result

        mock_session.execute = mock_execute
        yield mock_session

    app.dependency_overrides[get_db] = override
    response = await client.get("/api/v1/patients/code/BN-ABCD1234")
    app.dependency_overrides.clear()
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_patient_by_code_not_found_returns_404(client):
    from app.db.session import get_db

    async def override_get_db_none():
        mock_session = MagicMock()

        async def mock_execute(query):
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = None
            return mock_result

        mock_session.execute = mock_execute
        yield mock_session

    from app.main import app

    app.dependency_overrides[get_db] = override_get_db_none
    response = await client.get("/api/v1/patients/code/BN-NOTEXIST")
    app.dependency_overrides.clear()
    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not found"


@pytest.mark.asyncio
async def test_update_patient_returns_200(client):
    from app.db.session import get_db
    from app.main import app
    from datetime import datetime, timezone

    async def override():
        mock_session = MagicMock()

        async def mock_get(model, id):
            p = MagicMock()
            p.id = id
            p.patient_code = "BN-ABCD1234"
            p.phone = None
            p.address = None
            p.blood_type = None
            p.allergies = []
            p.chronic_diseases = []
            return p

        async def mock_commit():
            pass

        async def mock_refresh(obj):
            obj.created_at = datetime.now(timezone.utc)
            obj.updated_at = datetime.now(timezone.utc)

        mock_session.get = mock_get
        mock_session.commit = mock_commit
        mock_session.refresh = mock_refresh
        yield mock_session

    app.dependency_overrides[get_db] = override
    patient_id = uuid4()
    response = await client.put(f"/api/v1/patients/{patient_id}", json=PATIENT_PAYLOAD)
    app.dependency_overrides.clear()
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_patient_not_found_returns_404(client):
    from app.db.session import get_db

    async def override_get_db_none():
        mock_session = MagicMock()

        async def mock_get(model, id):
            return None

        mock_session.get = mock_get
        yield mock_session

    from app.main import app

    app.dependency_overrides[get_db] = override_get_db_none
    patient_id = uuid4()
    response = await client.put(f"/api/v1/patients/{patient_id}", json=PATIENT_PAYLOAD)
    app.dependency_overrides.clear()
    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not found"


@pytest.mark.asyncio
async def test_update_patient_missing_required_field_returns_422(client):
    patient_id = uuid4()
    response = await client.put(
        f"/api/v1/patients/{patient_id}",
        json={"full_name": "Nguyễn Văn B"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_delete_patient_returns_204(client):
    from app.db.session import get_db
    from app.main import app

    async def override():
        mock_session = MagicMock()

        async def mock_get(model, id):
            return MagicMock()

        async def mock_delete(obj):
            pass

        async def mock_commit():
            pass

        mock_session.get = mock_get
        mock_session.delete = mock_delete
        mock_session.commit = mock_commit
        yield mock_session

    app.dependency_overrides[get_db] = override
    patient_id = uuid4()
    response = await client.delete(f"/api/v1/patients/{patient_id}")
    app.dependency_overrides.clear()
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_patient_not_found_returns_404(client):
    from app.db.session import get_db

    async def override_get_db_none():
        mock_session = MagicMock()

        async def mock_get(model, id):
            return None

        mock_session.get = mock_get
        yield mock_session

    from app.main import app

    app.dependency_overrides[get_db] = override_get_db_none
    patient_id = uuid4()
    response = await client.delete(f"/api/v1/patients/{patient_id}")
    app.dependency_overrides.clear()
    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not found"


@pytest.mark.asyncio
async def test_delete_patient_invalid_uuid_returns_422(client):
    response = await client.delete("/api/v1/patients/not-a-uuid")
    assert response.status_code == 422
