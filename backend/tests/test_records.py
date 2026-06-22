import pytest
from uuid import uuid4
from unittest.mock import MagicMock

from app.models.patient import Patient
from app.models.record import MedicalRecord

PATIENT_ID = str(uuid4())

RECORD_PAYLOAD = {
    "patient_id": PATIENT_ID,
    "chief_complaint": "Sốt cao, ho đờm",
    "severity": "mild",
}


@pytest.mark.asyncio
async def test_create_record_returns_201(client):
    response = await client.post("/api/v1/records", json=RECORD_PAYLOAD)
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_create_record_response_has_required_fields(client):
    response = await client.post("/api/v1/records", json=RECORD_PAYLOAD)
    data = response.json()
    assert "id" in data
    assert "record_code" in data
    assert "created_by" in data
    assert "status" in data
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_create_record_stores_chief_complaint(client):
    response = await client.post("/api/v1/records", json=RECORD_PAYLOAD)
    data = response.json()
    assert data["chief_complaint"] == RECORD_PAYLOAD["chief_complaint"]


@pytest.mark.asyncio
async def test_create_record_with_all_optional_fields(client):
    payload = {
        **RECORD_PAYLOAD,
        "description": "Bệnh nhân sốt 3 ngày",
        "symptoms_duration": "3 ngày",
        "vital_signs": {"temperature": 39.5, "blood_pressure": "120/80"},
        "diagnosis": "Viêm phổi",
        "diagnosis_icd": "J18.9",
    }
    response = await client.post("/api/v1/records", json=payload)
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_create_record_missing_chief_complaint_returns_422(client):
    payload = {"patient_id": PATIENT_ID}
    response = await client.post("/api/v1/records", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_record_missing_patient_id_returns_422(client):
    payload = {"chief_complaint": "Sốt cao"}
    response = await client.post("/api/v1/records", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_record_patient_not_found_returns_404(client):
    from app.db.session import get_db

    async def override_get_db_no_patient():
        mock_session = MagicMock()

        async def mock_get(model, id):
            return None

        async def mock_execute(query):
            mock_result = MagicMock()
            mock_result.scalars.return_value.first.return_value = MagicMock()
            return mock_result

        mock_session.get = mock_get
        mock_session.execute = mock_execute
        yield mock_session

    from app.main import app

    app.dependency_overrides[get_db] = override_get_db_no_patient
    response = await client.post("/api/v1/records", json=RECORD_PAYLOAD)
    app.dependency_overrides.clear()
    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not found"


@pytest.mark.asyncio
async def test_list_records_returns_200(client):
    response = await client.get("/api/v1/records")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_list_records_returns_list(client):
    response = await client.get("/api/v1/records")
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_list_records_skip_and_limit_params_accepted(client):
    response = await client.get("/api/v1/records?skip=0&limit=10")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_list_records_filter_by_patient_id(client):
    patient_id = uuid4()
    response = await client.get(f"/api/v1/records?patient_id={patient_id}")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_list_records_invalid_limit_returns_422(client):
    response = await client.get("/api/v1/records?limit=0")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_record_by_id_returns_200(client):
    from app.db.session import get_db

    async def override_get_db_with_record():
        mock_session = MagicMock()
        record_id = uuid4()

        async def mock_get(model, id):
            if model == MedicalRecord:
                mock_record = MagicMock()
                mock_record.id = id
                mock_record.record_code = "BA-ABCD1234"
                mock_record.patient_id = uuid4()
                mock_record.created_by = uuid4()
                mock_record.chief_complaint = "Sốt cao"
                mock_record.status = "pending"
                from datetime import datetime, timezone
                mock_record.created_at = datetime.now(timezone.utc)
                mock_record.updated_at = datetime.now(timezone.utc)
                mock_record.severity = "mild"
                mock_record.description = None
                mock_record.symptoms_duration = None
                mock_record.vital_signs = None
                mock_record.diagnosis = None
                mock_record.diagnosis_icd = None
                return mock_record
            return None

        mock_session.get = mock_get
        yield mock_session

    from app.main import app

    app.dependency_overrides[get_db] = override_get_db_with_record
    record_id = uuid4()
    response = await client.get(f"/api/v1/records/{record_id}")
    app.dependency_overrides.clear()
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_record_by_id_not_found_returns_404(client):
    from app.db.session import get_db

    async def override_get_db_none():
        mock_session = MagicMock()

        async def mock_get(model, id):
            return None

        mock_session.get = mock_get
        yield mock_session

    from app.main import app

    app.dependency_overrides[get_db] = override_get_db_none
    record_id = uuid4()
    response = await client.get(f"/api/v1/records/{record_id}")
    app.dependency_overrides.clear()
    assert response.status_code == 404
    assert response.json()["detail"] == "Medical record not found"


@pytest.mark.asyncio
async def test_get_record_by_id_invalid_uuid_returns_422(client):
    response = await client.get("/api/v1/records/not-a-uuid")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_record_returns_200(client):
    from app.db.session import get_db

    async def override_get_db_with_record():
        mock_session = MagicMock()

        async def mock_get(model, id):
            mock_record = MagicMock()
            mock_record.id = id
            mock_record.record_code = "BA-ABCD1234"
            mock_record.patient_id = uuid4()
            mock_record.created_by = uuid4()
            mock_record.chief_complaint = "Sốt cao"
            mock_record.status = "pending"
            mock_record.severity = "mild"
            from datetime import datetime, timezone
            mock_record.created_at = datetime.now(timezone.utc)
            mock_record.updated_at = datetime.now(timezone.utc)
            return mock_record

        async def mock_commit():
            pass

        async def mock_refresh(obj):
            from datetime import datetime, timezone
            if not hasattr(obj, "id") or obj.id is None:
                obj.id = uuid4()
            if not hasattr(obj, "created_at") or obj.created_at is None:
                obj.created_at = datetime.now(timezone.utc)
            if not hasattr(obj, "updated_at") or obj.updated_at is None:
                obj.updated_at = datetime.now(timezone.utc)

        mock_session.get = mock_get
        mock_session.commit = mock_commit
        mock_session.refresh = mock_refresh
        yield mock_session

    from app.main import app

    app.dependency_overrides[get_db] = override_get_db_with_record
    record_id = uuid4()
    response = await client.put(f"/api/v1/records/{record_id}", json=RECORD_PAYLOAD)
    app.dependency_overrides.clear()
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_update_record_not_found_returns_404(client):
    from app.db.session import get_db

    async def override_get_db_none():
        mock_session = MagicMock()

        async def mock_get(model, id):
            return None

        mock_session.get = mock_get
        yield mock_session

    from app.main import app

    app.dependency_overrides[get_db] = override_get_db_none
    record_id = uuid4()
    response = await client.put(f"/api/v1/records/{record_id}", json=RECORD_PAYLOAD)
    app.dependency_overrides.clear()
    assert response.status_code == 404
    assert response.json()["detail"] == "Medical record not found"


@pytest.mark.asyncio
async def test_update_record_missing_required_field_returns_422(client):
    record_id = uuid4()
    response = await client.put(
        f"/api/v1/records/{record_id}",
        json={"patient_id": PATIENT_ID},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_delete_record_returns_204(client):
    from app.db.session import get_db

    async def override_get_db_with_record():
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

    from app.main import app

    app.dependency_overrides[get_db] = override_get_db_with_record
    record_id = uuid4()
    response = await client.delete(f"/api/v1/records/{record_id}")
    app.dependency_overrides.clear()
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_record_not_found_returns_404(client):
    from app.db.session import get_db

    async def override_get_db_none():
        mock_session = MagicMock()

        async def mock_get(model, id):
            return None

        mock_session.get = mock_get
        yield mock_session

    from app.main import app

    app.dependency_overrides[get_db] = override_get_db_none
    record_id = uuid4()
    response = await client.delete(f"/api/v1/records/{record_id}")
    app.dependency_overrides.clear()
    assert response.status_code == 404
    assert response.json()["detail"] == "Medical record not found"


@pytest.mark.asyncio
async def test_delete_record_invalid_uuid_returns_422(client):
    response = await client.delete("/api/v1/records/not-a-uuid")
    assert response.status_code == 422
