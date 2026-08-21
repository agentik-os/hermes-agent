from __future__ import annotations

from hermes_cli.project_inventory import merge_project_inventory


def test_projects_merge_hermes_history_and_live_mux_sessions(tmp_path) -> None:
    repo = tmp_path / "AGK-OS"
    repo.mkdir()
    (repo / ".git").mkdir()
    other = tmp_path / "hermes-agent"
    other.mkdir()
    projects = merge_project_inventory(
        [
            {"cwd": str(repo), "sessions": 3, "last_active": 10},
            {"cwd": str(other), "sessions": 1, "last_active": 5},
        ],
        [
            {"name": "architecture", "cwd": str(repo), "activity": 12},
            {"name": "runtime", "cwd": str(repo), "activity": 11},
        ],
    )
    assert projects[0] == {
        "cwd": str(repo),
        "is_git": True,
        "last_active": 12.0,
        "live_sessions": ["architecture", "runtime"],
        "name": "AGK-OS",
        "sessions": 3,
    }
    assert projects[1]["name"] == "hermes-agent"


def test_projects_drop_missing_paths_and_dedupe_realpaths(tmp_path) -> None:
    repo = tmp_path / "repo"
    repo.mkdir()
    alias = tmp_path / "alias"
    alias.symlink_to(repo, target_is_directory=True)
    projects = merge_project_inventory(
        [
            {"cwd": str(repo), "sessions": 1, "last_active": 1},
            {"cwd": str(alias), "sessions": 2, "last_active": 2},
            {"cwd": str(tmp_path / "missing"), "sessions": 9, "last_active": 9},
        ],
        [],
    )
    assert len(projects) == 1
    assert projects[0]["cwd"] == str(repo)
    assert projects[0]["sessions"] == 3
