"""Persistent, gateway-local CLI OAuth sessions backed by rmux/tmux.

Only fixed provider commands run. The renderer receives an authorization URL,
a prompt direction, and status — never terminal output or stored credentials.
"""
from __future__ import annotations

import os
import json
import re
import secrets
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from hermes_constants import get_hermes_home

from .mux_broker import MuxBroker

_ANSI_RE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
_URL_RE = re.compile(r"https://[^\s<>\"']+")
_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,31}$")


class CliAuthError(ValueError):
    pass


@dataclass(frozen=True)
class _ProviderSpec:
    binary: str
    env_key: str
    login_argv: tuple[str, ...]
    status_argv: tuple[str, ...]
    unset_env: tuple[str, ...]


_SPECS = {
    "claude-code": _ProviderSpec(
        binary="claude",
        env_key="CLAUDE_CONFIG_DIR",
        login_argv=("auth", "login", "--claudeai"),
        status_argv=("auth", "status", "--json"),
        unset_env=("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN"),
    ),
    "openai-cli": _ProviderSpec(
        binary="codex",
        env_key="CODEX_HOME",
        login_argv=("login",),
        status_argv=("login", "status"),
        unset_env=("OPENAI_API_KEY", "CODEX_API_KEY", "CODEX_ACCESS_TOKEN"),
    ),
}


def parse_login_view(output: str) -> dict[str, Any]:
    clean = _ANSI_RE.sub("", str(output or ""))
    match = _URL_RE.search(clean)
    url = match.group(0).rstrip(".,);]") if match else None
    lower = clean.lower()
    expects_code = any(
        marker in lower
        for marker in (
            "paste authorization code",
            "paste the code",
            "enter authorization code",
            "enter the code",
            "code from your browser",
        )
    )
    result: dict[str, Any] = {"auth_url": url, "expects_code": expects_code, "status": "pending"}
    if url is None:
        result.pop("auth_url")
    return result


class CliAuthBroker:
    def __init__(
        self,
        *,
        home: Path | str | None = None,
        mux: MuxBroker | None = None,
        which: Callable[[str], str | None] = shutil.which,
        run: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run,
        nonce: Callable[[], str] = lambda: secrets.token_hex(6),
    ) -> None:
        self.home = Path(home) if home is not None else Path(get_hermes_home())
        self.mux = mux or MuxBroker()
        self._which = which
        self._run = run
        self._nonce = nonce

    @staticmethod
    def _spec(provider: str) -> _ProviderSpec:
        spec = _SPECS.get(str(provider or "").strip().lower())
        if spec is None:
            raise CliAuthError("unsupported CLI auth provider")
        return spec

    @staticmethod
    def _account_id(account_id: str) -> str:
        value = str(account_id or "").strip().lower()
        if not _ID_RE.fullmatch(value):
            raise CliAuthError("invalid account id")
        return value

    def _slot(self, provider: str, account_id: str) -> Path:
        account = self._account_id(account_id)
        provider_root = self.home / "accounts" / provider
        if provider_root.is_symlink():
            raise CliAuthError("account provider directory must not be a symlink")
        provider_root.mkdir(parents=True, mode=0o700, exist_ok=True)
        slot = provider_root / account
        if slot.is_symlink():
            raise CliAuthError("account slot must not be a symlink")
        slot.mkdir(mode=0o700, exist_ok=True)
        if slot.is_symlink():
            raise CliAuthError("account slot must not be a symlink")
        if os.name == "posix":
            slot.chmod(0o700)
        return slot

    def _session_prefix(self, provider: str, account_id: str) -> str:
        account = self._account_id(account_id)
        return f"hermes-auth-{provider}-{account}-"

    def _new_session_id(self, provider: str, account_id: str) -> str:
        nonce = str(self._nonce() or "").lower()
        if not re.fullmatch(r"[0-9a-f]{12}", nonce):
            raise CliAuthError("invalid authorization session nonce")
        return f"{self._session_prefix(provider, account_id)}{nonce}"

    def _validate_session(self, provider: str, account_id: str, session_id: str) -> str:
        value = str(session_id or "")
        prefix = self._session_prefix(provider, account_id)
        if not value.startswith(prefix) or not re.fullmatch(r"[0-9a-f]{12}", value[len(prefix) :]):
            raise CliAuthError("authorization session does not match provider and account")
        return value

    @staticmethod
    def _read_marker(slot: Path) -> tuple[str, int]:
        marker = slot / ".hermes-auth-session"
        if marker.is_symlink() or not marker.is_file():
            raise CliAuthError("authorization session is not owned by Hermes")
        try:
            payload = json.loads(marker.read_text(encoding="utf-8"))
            session_id = str(payload.get("session_id") or "")
            pane_pid = int(payload.get("pane_pid") or 0)
        except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
            raise CliAuthError("authorization session ownership could not be verified") from exc
        if not session_id or pane_pid <= 0:
            raise CliAuthError("authorization session ownership could not be verified")
        return session_id, pane_pid

    def _assert_owned_session(
        self, provider: str, account_id: str, session_id: str
    ) -> tuple[str, Path, dict[str, Any] | None]:
        expected = self._validate_session(provider, account_id, session_id)
        slot = self._slot(provider, account_id)
        marker_session, marker_pid = self._read_marker(slot)
        if marker_session != expected:
            raise CliAuthError("authorization session is not owned by Hermes")
        inventory = self.mux.list_sessions()
        live = next((row for row in inventory.get("sessions", []) if row.get("name") == expected), None)
        if live is not None and int(live.get("pane_pid") or 0) != marker_pid:
            raise CliAuthError("authorization session is not owned by Hermes")
        return expected, slot, live

    @staticmethod
    def _clear_marker(slot: Path) -> None:
        marker = slot / ".hermes-auth-session"
        try:
            marker.unlink(missing_ok=True)
        except OSError:
            pass

    def start(self, provider: str, account_id: str) -> dict[str, Any]:
        provider_id = str(provider or "").strip().lower()
        spec = self._spec(provider_id)
        account = self._account_id(account_id)
        slot = self._slot(provider_id, account)
        marker = slot / ".hermes-auth-session"
        inventory = self.mux.list_sessions()
        live_by_name = {str(row.get("name") or ""): row for row in inventory.get("sessions", [])}
        if marker.is_symlink():
            raise CliAuthError("authorization session marker must not be a symlink")
        if marker.is_file():
            try:
                existing, marker_pid = self._read_marker(slot)
                existing = self._validate_session(provider_id, account, existing)
            except CliAuthError:
                existing = ""
                marker_pid = 0
            live = live_by_name.get(existing)
            if live is not None and int(live.get("pane_pid") or 0) == marker_pid:
                return {
                    "account_id": account,
                    "provider": provider_id,
                    "session_id": existing,
                    "status": "pending",
                }
            self._clear_marker(slot)

        session_id = self._new_session_id(provider_id, account)
        if session_id in live_by_name:
            raise CliAuthError("existing authorization session is not owned by Hermes")
        binary = self._which(spec.binary)
        if not binary:
            raise CliAuthError(f"{spec.binary} CLI is not installed on this gateway")
        unset_args = [part for key in spec.unset_env for part in ("-u", key)]
        command = ["env", *unset_args, f"{spec.env_key}={slot}", binary, *spec.login_argv]
        self.mux.create(session_id, cwd=str(slot), command=command)
        try:
            created_inventory = self.mux.list_sessions()
            created = next(
                (row for row in created_inventory.get("sessions", []) if row.get("name") == session_id),
                None,
            )
            pane_pid = int(created.get("pane_pid") or 0) if created else 0
            if pane_pid <= 0:
                raise OSError("mux did not report a pane pid")
            marker.write_text(
                json.dumps({"session_id": session_id, "pane_pid": pane_pid}, separators=(",", ":")) + "\n",
                encoding="utf-8",
            )
            if os.name == "posix":
                marker.chmod(0o600)
        except OSError as exc:
            try:
                self.mux.close(session_id)
            except Exception:
                pass
            raise CliAuthError("authorization session ownership marker could not be written") from exc
        return {
            "account_id": account,
            "provider": provider_id,
            "session_id": session_id,
            "status": "pending",
        }

    def poll(self, provider: str, account_id: str, session_id: str) -> dict[str, Any]:
        provider_id = str(provider or "").strip().lower()
        spec = self._spec(provider_id)
        expected, slot, live = self._assert_owned_session(provider_id, account_id, session_id)
        if live is not None:
            captured = self.mux.capture(expected, lines=300)
            return parse_login_view(str(captured.get("ansi") or ""))

        binary = self._which(spec.binary)
        if not binary:
            self._clear_marker(slot)
            return {"status": "error"}
        env = dict(os.environ)
        for key in spec.unset_env:
            env.pop(key, None)
        env[spec.env_key] = str(slot)
        try:
            result = self._run(
                [binary, *spec.status_argv],
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
                env=env,
            )
        except Exception:
            self._clear_marker(slot)
            return {"status": "error"}
        output = f"{result.stdout or ''}\n{result.stderr or ''}".lower()
        denied_markers = (
            '"loggedin": false',
            '"loggedin":false',
            "not logged",
            "logged out",
            "not authenticated",
            "please run",
            "please log in",
            "login required",
            "no credentials",
        )
        approved_markers = ('"loggedin": true', '"loggedin":true', "logged in")
        approved = (
            result.returncode == 0
            and not any(marker in output for marker in denied_markers)
            and any(marker in output for marker in approved_markers)
        )
        self._clear_marker(slot)
        return {"status": "approved" if approved else "error"}

    def submit(
        self,
        provider: str,
        account_id: str,
        session_id: str,
        code: str,
    ) -> dict[str, Any]:
        provider_id = str(provider or "").strip().lower()
        self._spec(provider_id)
        expected, _slot, live = self._assert_owned_session(provider_id, account_id, session_id)
        if live is None:
            raise CliAuthError("authorization session is no longer active")
        value = str(code or "").strip()
        if not value or len(value) > 4096 or "\n" in value or "\r" in value or "\x00" in value:
            raise CliAuthError("invalid authorization code")
        self.mux.send_input(expected, text=value)
        self.mux.send_input(expected, key="Enter")
        return {"status": "pending"}

    def cancel(self, provider: str, account_id: str, session_id: str) -> dict[str, Any]:
        provider_id = str(provider or "").strip().lower()
        self._spec(provider_id)
        expected, slot, live = self._assert_owned_session(provider_id, account_id, session_id)
        if live is not None:
            self.mux.close(expected)
        self._clear_marker(slot)
        return {"status": "cancelled"}
