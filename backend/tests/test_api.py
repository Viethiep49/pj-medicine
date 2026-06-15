import pytest
from uuid import uuid4
from unittest.mock import patch

@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_predict_endpoint(client):
    predict_data = {
        "text": "Bệnh nhân sốt cao 39 độ, ho đờm",
        "top_k": 3
    }
    response = await client.post("/api/v1/predictions/predict", json=predict_data)
    assert response.status_code == 200
    data = response.json()
    assert "source" in data
    assert len(data["results"]) == 3

@pytest.mark.asyncio
async def test_drug_groups_endpoint(client):
    response = await client.get("/api/v1/drug-groups")
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_analytics_overview_endpoint(client):
    response = await client.get("/api/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_predictions" in data

@pytest.mark.asyncio
async def test_rate_limiting(client):
    # SlowAPI uses remote_addr. Since we're using TestClient (ASGITransport), all requests 
    # look like they come from "testclient" or 127.0.0.1.
    predict_data = {"text": "test rate limit", "top_k": 1}
    
    # Mock predict_drug_groups to avoid 21 slow inference runs
    with patch("app.api.predictions.predict_drug_groups") as mock_predict:
        # Provide a dummy return value for the mocked function
        mock_predict.return_value = []
        
        # Send 20 requests (which should succeed)
        for _ in range(20):
            res = await client.post("/api/v1/predictions/predict", json=predict_data)
            assert res.status_code == 200
        
        # The 21st request should hit the rate limit
        res = await client.post("/api/v1/predictions/predict", json=predict_data)
        assert res.status_code == 429
        assert "Rate limit exceeded" in res.json()["detail"] or "429" in str(res.json())
