from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import csv
import io
from typing import List, Dict, Any

class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_popular_symptoms(self, limit: int = 10) -> List[Dict[str, Any]]:
        # Using raw SQL to group and count queries
        query = text("""
            SELECT query_text, COUNT(*) as count 
            FROM search_logs 
            WHERE query_text IS NOT NULL AND query_text != ''
            GROUP BY query_text 
            ORDER BY count DESC 
            LIMIT :limit
        """)
        result = await self.db.execute(query, {"limit": limit})
        return [{"symptom": row.query_text, "count": row.count} for row in result]

    async def get_drug_group_distribution(self) -> List[Dict[str, Any]]:
        query = text("""
            SELECT predicted_group, COUNT(*) as count 
            FROM search_logs 
            WHERE predicted_group IS NOT NULL 
            GROUP BY predicted_group 
            ORDER BY count DESC
        """)
        result = await self.db.execute(query)
        return [{"group": row.predicted_group, "count": row.count} for row in result]

    async def get_daily_usage(self, days: int = 7) -> List[Dict[str, Any]]:
        query = text("""
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM search_logs 
            WHERE created_at >= CURRENT_DATE - INTERVAL ':days days'
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        """)
        # We need to manually inject the interval for postgres depending on driver, 
        # or use standard parameter passing where supported.
        # simpler postgres compatible approach:
        query = text(f"""
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM search_logs 
            WHERE created_at >= CURRENT_DATE - INTERVAL '{days} days'
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        """)
        result = await self.db.execute(query)
        return [{"date": str(row.date), "count": row.count} for row in result]

    async def get_search_trends(self) -> List[Dict[str, Any]]:
        query = text("""
            SELECT 
                DATE_TRUNC('hour', created_at) as hour, 
                COUNT(*) as count 
            FROM search_logs 
            WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours'
            GROUP BY DATE_TRUNC('hour', created_at) 
            ORDER BY hour ASC
        """)
        result = await self.db.execute(query)
        return [{"time": str(row.hour), "count": row.count} for row in result]

    async def get_model_performance(self) -> Dict[str, Any]:
        query = text("""
            SELECT 
                AVG(confidence) as avg_confidence,
                AVG(response_time_ms) as avg_response_time,
                MAX(response_time_ms) as max_response_time,
                COUNT(*) as total_predictions
            FROM search_logs
        """)
        result = await self.db.execute(query)
        row = result.fetchone()
        if row:
            return {
                "avg_confidence": round(float(row.avg_confidence), 4) if row.avg_confidence else 0,
                "avg_response_time_ms": round(float(row.avg_response_time), 2) if row.avg_response_time else 0,
                "max_response_time_ms": int(row.max_response_time) if row.max_response_time else 0,
                "total_predictions": int(row.total_predictions) if row.total_predictions else 0
            }
        return {"avg_confidence": 0, "avg_response_time_ms": 0, "max_response_time_ms": 0, "total_predictions": 0}

    async def export_logs_csv(self) -> str:
        query = text("""
            SELECT id, session_id, endpoint, query_text, predicted_group, confidence, response_time_ms, created_at 
            FROM search_logs 
            ORDER BY created_at DESC
        """)
        result = await self.db.execute(query)
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "session_id", "endpoint", "query_text", "predicted_group", "confidence", "response_time_ms", "created_at"])
        
        for row in result:
            writer.writerow([row.id, row.session_id, row.endpoint, row.query_text, row.predicted_group, row.confidence, row.response_time_ms, row.created_at])
            
        return output.getvalue()
