# basic settings; db url, env vars
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_user: str
    database_pw: str
    database_name: str

    @property
    def database_url(self): #to build url from env
        return f"postgresql+psycopg2://{self.database_user}:{self.database_pw}@localhost:5432/{self.database_name}"

    class Config: #use pydantic to load variables from .env
        env_file = ".env"

settings = Settings()