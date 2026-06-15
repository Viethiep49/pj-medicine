from .patients import router as patients_router
from .records import router as records_router
from .predictions import router as predictions_router
from .drug_groups import router as drug_groups_router
from .analytics import router as analytics_router

__all__ = ["patients_router", "records_router", "predictions_router", "drug_groups_router", "analytics_router"]
