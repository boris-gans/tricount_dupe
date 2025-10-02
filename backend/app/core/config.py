# basic settings; db url, env vars
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_user: str
    database_pw: str
    database_name: str
    jwt_secret_key: str
    jwt_algorithm: str
    jwt_expiration_minutes: int

    log_format: str
    base_logger_name: str

    @property
    def database_url(self): #to build url from env
        return f"postgresql+psycopg2://{self.database_user}:{self.database_pw}@localhost:5432/{self.database_name}"

    class Config: #tell pydantic to load variables from .env
        env_file = ".env"

settings = Settings()