import sys

from app.database import Model, engine, new_session
from app.models import User
from app.security import hash_password

email, password = sys.argv[1], sys.argv[2]

Model.metadata.create_all(engine)

db = new_session()
db.add(User(full_name="Администратор", email=email, password_hash=hash_password(password), role="admin"))
db.commit()
db.close()
print("Администратор создан")
