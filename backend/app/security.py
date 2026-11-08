from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import ALGORITHM, SECRET_KEY, TOKEN_EXPIRE_MINUTES


def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password, password_hash):
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user_id):
    expires = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    return int(payload["sub"])
