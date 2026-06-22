from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str = "doctor"


class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None
