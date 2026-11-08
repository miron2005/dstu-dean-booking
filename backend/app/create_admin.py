import sys

from app.database import Base, SessionLocal, engine
from app.models import User
from app.security import hash_password

email, password = sys.argv[1], sys.argv[2]

Base.metadata.create_all(engine)

db = SessionLocal()
db.add(User(full_name="Администратор", email=email, password_hash=hash_password(password), role="admin"))
db.commit()
db.close()
print("Администратор создан")
