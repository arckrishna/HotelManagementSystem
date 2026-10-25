import os

class Settings:
    PROJECT_NAME: str = "StaySync — Integrated Hospitality Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database URL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg://postgres:password@localhost:5432/staysync_db"
    )
    
    # JWT Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "staysync_super_secret_jwt_key_2026_d12a_hospitality_prototype")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

settings = Settings()
