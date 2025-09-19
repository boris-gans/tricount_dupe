# basic settings; db url, env vars
from pydantic import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    DATABASE_USER = os.getenv("DATABASE_USER")
    DATABASE_PW = os.getenv("DATABASE_PW")
    DATABASE_NAME = os.getenv("DATABASE_NAME")
    DATABASE_URL = f"postgresql+psycopg2://{DATABASE_USER}:{DATABASE_PW}@localhost:5432/{DATABASE_NAME}"

settings = Settings()