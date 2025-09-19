# DBSession object; manages connections
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from .base import Base
from ..core.config import settings

engine = create_engine(settings.DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# for fastapi injection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()