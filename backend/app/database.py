from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL)
new_session = sessionmaker(engine)


class Model(DeclarativeBase):
    pass


def get_db():
    with new_session() as session:
        yield session
