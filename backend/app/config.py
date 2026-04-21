from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration centrale chargée depuis le fichier .env."""

    GROQ_API_KEY: str = ""
    SECRET_KEY: str = "change-me-in-production"
    DATABASE_URL: str = "sqlite:///./socratic_viva.db"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # RAG / Vector store
    CHROMA_PERSIST_DIR: str = "./chroma_data"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
