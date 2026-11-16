import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://deanery:deanery@localhost:5433/deanery")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 12

SLOT_CHOICES = (10, 15, 20, 30)
BOOKING_LEAD_MINUTES = 10
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:4200,http://127.0.0.1:4200").split(",")
