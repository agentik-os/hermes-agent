from pathlib import Path

from hermes_cli.web_server import _agk_runtime_contract


def test_agk_runtime_contract_preserves_canonical_identity_and_capabilities():
    result = _agk_runtime_contract(
        {
            "_config_version": 38,
            "runtime_identity": {
                "machine_id": "agk-core",
                "environment_id": "mission",
            },
            "discord": {"allowed_channels": "123"},
        },
        Path("/home/mission/.hermes"),
        "fallback-host",
    )

    assert result["machine_id"] == "agk-core"
    assert result["environment_id"] == "mission"
    assert result["protocol"]["session_key"] == [
        "machine_id",
        "environment_id",
        "project_or_client_id",
        "session_id",
    ]
    assert result["state_schema"]["version"] == 38
    assert result["capabilities"]["sessions"] is True
    assert result["capabilities"]["discord"] is True


def test_agk_runtime_contract_derives_safe_defaults():
    result = _agk_runtime_contract({}, Path("/srv/private/.hermes"), "node-1")

    assert result["machine_id"] == "node-1"
    assert result["environment_id"] == "private"
    assert result["capabilities"]["discord"] is False
