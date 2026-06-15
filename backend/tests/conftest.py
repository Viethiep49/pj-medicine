import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from uuid import uuid4
from unittest.mock import MagicMock

from app.main import app
from app.db.session import get_db
from app.models.patient import Patient

@pytest_asyncio.fixture
async def client():
    # Mock database session
    mock_session = MagicMock()
    
    mock_user = MagicMock()
    mock_user.id = uuid4()
    
    async def mock_execute(query):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = mock_user
        mock_result.scalars.return_value.all.return_value = []
        mock_result.scalar.return_value = 100 # For analytics overview total count
        return mock_result
        
    mock_session.execute = mock_execute
    
    async def mock_get(model, id):
        if model == Patient:
            p = MagicMock()
            p.id = id
            return p
        return None
        
    mock_session.get = mock_get
    
    async def mock_commit(): pass
    mock_session.commit = mock_commit
    
    async def mock_refresh(obj):
        from datetime import datetime, timezone
        obj.id = uuid4()
        obj.created_at = datetime.now(timezone.utc)
        obj.updated_at = datetime.now(timezone.utc)
        if hasattr(obj, 'created_by') and obj.created_by is None:
            obj.created_by = uuid4()
        if hasattr(obj, 'status') and obj.status is None:
            obj.status = 'pending'
            
    mock_session.refresh = mock_refresh
    
    async def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    
    # We use ASGITransport to hit the FastAPI app directly for testing
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
