from pydantic import BaseModel
from datetime import datetime

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    email: str
    role: str
    full_name: str

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    phone: str | None = None
    role: str

class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    phone: str | None
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
