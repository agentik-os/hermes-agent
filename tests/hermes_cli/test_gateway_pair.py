from __future__ import annotations

import argparse

import pytest

from hermes_cli.gateway_pair import build_desktop_pair_link, resolve_gateway_pair_url
from hermes_cli.subcommands.gateway import build_gateway_parser


def test_pair_link_contains_only_metadata_and_uses_https() -> None:
    link = build_desktop_pair_link("https://station.example:8463/", "Station VPS")
    assert link == "hermes://gateway/add?url=https%3A%2F%2Fstation.example%3A8463&label=Station+VPS&auth=oauth"
    assert "token" not in link.lower()


def test_pair_link_rejects_plaintext_remote_and_url_credentials() -> None:
    with pytest.raises(ValueError, match="HTTPS"):
        build_desktop_pair_link("http://station.example:8463", "Station")
    with pytest.raises(ValueError, match="credentials"):
        build_desktop_pair_link("https://user:pass@station.example", "Station")
    assert build_desktop_pair_link("http://127.0.0.1:8463", "Local test").startswith("hermes://gateway/add?")


def test_resolve_pair_url_uses_explicit_then_dashboard_public_url() -> None:
    assert resolve_gateway_pair_url("https://explicit.example", {"dashboard": {"public_url": "https://cfg.example"}}) == "https://explicit.example"
    assert resolve_gateway_pair_url(None, {"dashboard": {"public_url": "https://cfg.example/"}}) == "https://cfg.example"
    with pytest.raises(ValueError, match="--url"):
        resolve_gateway_pair_url(None, {})


def test_gateway_parser_accepts_pair_command() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command")
    noop = lambda _args: None
    build_gateway_parser(sub, cmd_gateway=noop, cmd_proxy=noop, cmd_gateway_enroll=noop)
    args = parser.parse_args(["gateway", "pair", "--url", "https://station.example", "--label", "Station VPS"])
    assert args.gateway_command == "pair"
    assert args.url == "https://station.example"
    assert args.label == "Station VPS"
