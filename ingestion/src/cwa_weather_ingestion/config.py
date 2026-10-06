"""Configuration loading for CWA ingestion jobs."""

from __future__ import annotations

from dataclasses import dataclass
import os


DEFAULT_DATASET_ID = "F-D0047-091"
DEFAULT_BASE_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore"
DEFAULT_TIMEOUT_SECONDS = 20.0


class CwaConfigurationError(ValueError):
    """Raised when required CWA runtime configuration is absent or invalid."""


@dataclass(frozen=True)
class CwaSettings:
    """Server-side CWA request settings loaded from environment variables."""

    api_key: str
    dataset_id: str = DEFAULT_DATASET_ID
    base_url: str = DEFAULT_BASE_URL
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS

    @classmethod
    def from_environment(cls) -> "CwaSettings":
        """Load CWA settings without exposing the credential in source code."""
        api_key = os.environ.get("CWA_API_KEY", "").strip()
        if not api_key:
            raise CwaConfigurationError("CWA_API_KEY must be set for CWA synchronization")

        dataset_id = os.environ.get("CWA_DATASET_ID", DEFAULT_DATASET_ID).strip()
        if dataset_id != DEFAULT_DATASET_ID:
            raise CwaConfigurationError(
                f"CWA_DATASET_ID must be {DEFAULT_DATASET_ID} for this MVP"
            )

        base_url = os.environ.get("CWA_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
        timeout_text = os.environ.get("CWA_TIMEOUT_SECONDS", str(DEFAULT_TIMEOUT_SECONDS))
        try:
            timeout_seconds = float(timeout_text)
        except ValueError as error:
            raise CwaConfigurationError("CWA_TIMEOUT_SECONDS must be a number") from error

        if timeout_seconds <= 0:
            raise CwaConfigurationError("CWA_TIMEOUT_SECONDS must be positive")

        return cls(
            api_key=api_key,
            dataset_id=dataset_id,
            base_url=base_url,
            timeout_seconds=timeout_seconds,
        )
