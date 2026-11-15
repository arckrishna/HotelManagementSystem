from pydantic import BaseModel, ConfigDict
from datetime import datetime

class GuestCreate(BaseModel):
    user_id: int | None = None
    first_name: str
    last_name: str
    email: str
    phone: str
    id_proof_type: str | None = None
    id_proof_number: str | None = None
    address: str | None = None
    vip_status: bool = False
    notes: str | None = None

class GuestUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    id_proof_type: str | None = None
    id_proof_number: str | None = None
    address: str | None = None
    vip_status: bool | None = None
    notes: str | None = None

class GuestResponse(BaseModel):
    id: int
    user_id: int | None
    first_name: str
    last_name: str
    email: str
    phone: str
    id_proof_type: str | None
    id_proof_number: str | None
    address: str | None
    vip_status: bool
    notes: str | None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
