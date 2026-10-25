import sys
import os
import pytest
from starlette.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.main import app
from app.db.session import SessionLocal
from app.core.security import create_access_token
from app.models.user import User

@pytest.fixture(scope="session")
def client():
    return TestClient(app)

@pytest.fixture(scope="session")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def get_token_for(username: str, role: str, db_session) -> str:
    user = db_session.query(User).filter(User.username == username).first()
    if not user:
        raise ValueError(f"User {username} not found in database. Run seed.py first.")
    return create_access_token(subject=user.id, role=role)

@pytest.fixture(scope="session")
def admin_headers(db):
    token = get_token_for("admin", "admin", db)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def receptionist_headers(db):
    token = get_token_for("receptionist", "receptionist", db)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def restaurant_headers(db):
    token = get_token_for("restaurant", "restaurant_staff", db)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def bar_headers(db):
    token = get_token_for("bar", "bar_staff", db)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def maintenance_headers(db):
    token = get_token_for("maintenance", "maintenance_staff", db)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def inventory_headers(db):
    token = get_token_for("inventory", "inventory_manager", db)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def accountant_headers(db):
    token = get_token_for("accountant", "accountant", db)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def guest1_headers(db):
    token = get_token_for("guest1", "guest", db)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="session")
def guest2_headers(db):
    token = get_token_for("guest2", "guest", db)
    return {"Authorization": f"Bearer {token}"}
