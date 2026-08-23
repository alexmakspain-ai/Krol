from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "sqlite:///./expense_tracker.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    cors_origins: str = "http://localhost:4200"

    def model_post_init(self, __context) -> None:
        if self.database_url.startswith("postgres://"):
            self.database_url = self.database_url.replace(
                "postgres://", "postgresql://", 1
            )

    @property
    def cors_origins_list(self) -> list[str]:
        origins = {"http://localhost:4200"}
        for raw in self.cors_origins.split(","):
            origin = raw.strip()
            if not origin:
                continue
            if not origin.startswith("http://") and not origin.startswith("https://"):
                origin = f"https://{origin}"
            origins.add(origin)
        return list(origins)


settings = Settings()
