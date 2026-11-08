import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://deanery:deanery@localhost:5433/deanery")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 12
