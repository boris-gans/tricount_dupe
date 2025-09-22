# DBSession object; manages connections
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from app.db.base import Base
from app.core.config import settings
from app.db import models

engine = create_engine(settings.database_url, echo=False)
Base.metadata.create_all(engine) #create tables if it doesn't exist

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# for fastapi injection
def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except:
        db.rollback()
    finally:
        db.close()