"""HTTP client for the CWA F-D0047-091 forecast dataset."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx

from .config import CwaSettings


class CwaUpstreamError(RuntimeError):
    """Raised when CWA cannot return a usable successful response."""


@dataclass(frozen=True)
class CwaFetchResult:
    """A validated CWA response plus non-sensitive fetch metadata."""

    payload: dict[str, Any]
    fetched_at: datetime
    source_url: str
    status_code: int


class CwaForecastClient:
    """Request CWA forecast data with explicit timeout and failure handling."""

    def __init__(
        self,
        settings: CwaSettings,
        *,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._settings = settings
        self._http_client = http_client or httpx.Client()
        self._owns_http_client = http_client is None

    def __enter__(self) -> "CwaForecastClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def close(self) -> None:
        """Close only the client created by this instance."""
        if self._owns_http_client:
            self._http_client.close()

    @property
    def endpoint(self) -> str:
        """Return the credential-free endpoint used for the dataset request."""
        return f"{self._settings.base_url}/{self._settings.dataset_id}"

    def fetch(self) -> CwaFetchResult:
        """Fetch and validate one F-D0047-091 JSON response from CWA."""
        try:
            response = self._http_client.get(
                self.endpoint,
                params={"Authorization": self._settings.api_key, "format": "JSON"},
                timeout=self._settings.timeout_seconds,
            )
        except httpx.TimeoutException as error:
            raise CwaUpstreamError("CWA request timed out") from error
        except httpx.RequestError as error:
            raise CwaUpstreamError(f"CWA request failed: {error.__class__.__name__}") from error

        if not response.is_success:
            raise CwaUpstreamError(f"CWA returned HTTP {response.status_code}")

        try:
            payload = response.json()
        except ValueError as error:
            raise CwaUpstreamError("CWA returned invalid JSON") from error

        if not isinstance(payload, dict):
            raise CwaUpstreamError("CWA returned a JSON value other than an object")

        success = payload.get("success")
        if success is False or (isinstance(success, str) and success.lower() == "false"):
            raise CwaUpstreamError("CWA marked the dataset response as unsuccessful")

        if "records" not in payload:
            raise CwaUpstreamError("CWA response does not contain records")

        return CwaFetchResult(
            payload=payload,
            fetched_at=datetime.now(timezone.utc),
            # Do not use response.url: it contains the Authorization query parameter.
            source_url=self.endpoint,
            status_code=response.status_code,
        )
