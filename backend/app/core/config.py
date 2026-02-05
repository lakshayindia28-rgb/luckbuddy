from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    JWT_SECRET: str = "luckbuddy-secret"
    JWT_ALGORITHM: str = "HS256"

settings = Settings()
