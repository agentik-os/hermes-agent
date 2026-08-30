"""Safe Desktop pairing-link generation for self-hosted Hermes gateways."""
from __future__ import annotations

import socket
from typing import Any
from urllib.parse import urlencode, urlsplit, urlunsplit


def _normalize_gateway_url(raw: str) -> str:
    value = str(raw or "").strip().rstrip("/")
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("gateway URL must be an absolute HTTP(S) URL")
    if parsed.username or parsed.password:
        raise ValueError("gateway URL must not contain credentials")
    if parsed.query or parsed.fragment:
        raise ValueError("gateway URL must not contain query parameters or fragments")
    loopback = parsed.hostname.lower() in {"127.0.0.1", "localhost", "::1"}
    if parsed.scheme != "https" and not loopback:
        raise ValueError("remote gateway pairing requires HTTPS")
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path.rstrip("/"), "", ""))


def build_desktop_pair_link(url: str, label: str) -> str:
    base_url = _normalize_gateway_url(url)
    clean_label = " ".join(str(label or "").split()).strip()
    if not clean_label or len(clean_label) > 80:
        raise ValueError("label must be between 1 and 80 characters")
    query = urlencode({"url": base_url, "label": clean_label, "auth": "oauth"})
    return f"hermes://gateway/add?{query}"


def resolve_gateway_pair_url(explicit: str | None, config: dict[str, Any]) -> str:
    candidate = str(explicit or "").strip()
    if not candidate:
        dashboard = config.get("dashboard") if isinstance(config, dict) else None
        if isinstance(dashboard, dict):
            candidate = str(dashboard.get("public_url") or "").strip()
    if not candidate:
        raise ValueError("gateway public URL required; pass --url or set dashboard.public_url")
    return _normalize_gateway_url(candidate)


def pair_output(*, url: str | None, label: str | None, config: dict[str, Any]) -> dict[str, str]:
    base_url = resolve_gateway_pair_url(url, config)
    resolved_label = " ".join(str(label or socket.gethostname()).split()).strip()
    return {"url": base_url, "label": resolved_label, "link": build_desktop_pair_link(base_url, resolved_label)}
