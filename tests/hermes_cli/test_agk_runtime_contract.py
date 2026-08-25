from pathlib import Path

import sqlite3

from hermes_cli.web_server import _agk_runtime_contract, _agk_runtime_rows


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
    assert result["protocol"]["version"] == 2
    assert result["capabilities"]["rmux_runtime"] is True
    assert result["capabilities"]["agentik_commands"] is True


def test_agk_runtime_contract_derives_safe_defaults():
    result = _agk_runtime_contract({}, Path("/srv/private/.hermes"), "node-1")

    assert result["machine_id"] == "node-1"
    assert result["environment_id"] == "private"
    assert result["capabilities"]["discord"] is False


def test_agk_runtime_api_rows_are_redacted_and_bounded(tmp_path):
    home = tmp_path / "mission"; hermes = home / ".hermes"; hermes.mkdir(parents=True)
    agentik = home / ".agentik"; agentik.mkdir()
    db = sqlite3.connect(agentik / "runtime.db")
    db.execute("""CREATE TABLE runtime_sessions (
      id TEXT,name TEXT,type TEXT,environment TEXT,client TEXT,project TEXT,mission TEXT,
      native_session TEXT,rmux_session TEXT,cwd TEXT,status TEXT,parent_session_id TEXT,
      created_at REAL,last_activity REAL,archived_at REAL,command_json TEXT)""")
    db.execute("INSERT INTO runtime_sessions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
               ("RT-1","mission-work","codex","mission","moonbase","dashboard","audit",
                "X-1","mission-work",str(home),"working",None,1,2,None,'["secret-command"]'))
    db.commit(); db.close()
    rows = _agk_runtime_rows(hermes)
    assert rows[0]["id"] == "RT-1"
    assert "command_json" not in rows[0]
