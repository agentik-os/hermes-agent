from pathlib import Path

import pytest

from plugins.agentik_os.commands import AgentikCommandService
from plugins.agentik_os.paths import PathResolver, normalize_slug
from plugins.agentik_os.store import ControlStore


@pytest.fixture
def mission_service(tmp_path: Path) -> AgentikCommandService:
    home = tmp_path / "mission"
    (home / "workspace" / "clients").mkdir(parents=True)
    return AgentikCommandService(
        "mission",
        ControlStore(home / ".agentik" / "control.db"),
        PathResolver("mission", home),
    )


def test_mission_vertical_slice_creates_hierarchy_and_paths(mission_service):
    client = mission_service.dispatch("client", 'new "Moonbase Labs"')
    assert "Client created" in client
    assert "moonbase-labs" in client

    project = mission_service.dispatch("project", 'new "Operator Dashboard"')
    assert "Project created" in project
    mission = mission_service.dispatch("mission", 'new "CEO Reporting"')
    assert "Mission created" in mission
    task = mission_service.dispatch("task", 'new "Audit KPI workflow"')
    assert "Task created" in task

    active = mission_service.dispatch("active", "")
    assert "Moonbase Labs" in active
    assert "Operator Dashboard" in active
    assert "CEO Reporting" in active
    assert "Audit KPI workflow" in active

    client_path = mission_service.resolver.home / "workspace/clients/moonbase-labs"
    project_path = client_path / "projects/operator-dashboard"
    mission_path = project_path / "missions/ceo-reporting"
    assert (client_path / "CLIENT.md").is_file()
    assert (project_path / "PROJECT.md").is_file()
    assert (mission_path / "mission.yaml").is_file()


def test_project_requires_open_client_in_mission(mission_service):
    result = mission_service.dispatch("project", "new orphan")
    assert "open a client" in result
    assert not (mission_service.resolver.home / "workspace/clients/orphan").exists()


def test_context_home_clears_hierarchy(mission_service):
    mission_service.dispatch("client", "new Moonbase")
    mission_service.dispatch("project", "new Dashboard")
    assert mission_service.context()["project_id"]
    mission_service.dispatch("home", "")
    context = mission_service.context()
    assert context["client_id"] is None
    assert context["project_id"] is None
    assert context["mission_id"] is None
    assert context["task_id"] is None
    assert context["run_id"] is None


def test_path_resolver_rejects_wrong_environment_and_normalizes(tmp_path):
    assert normalize_slug("  CEO / Q4  ") == "ceo-q4"
    with pytest.raises(PermissionError):
        PathResolver("private", tmp_path).client("moonbase")


def test_os_registry_empty_is_truthful(mission_service, monkeypatch, tmp_path):
    # The command degrades truthfully when no registry is mounted in a test.
    result = mission_service.dispatch("os", "list")
    assert "Installed packages: 0" in result
    assert "No Operative Systems are installed" in result


def test_lifecycle_transition_is_persisted(mission_service):
    mission_service.dispatch("client", "new Moonbase")
    mission_service.dispatch("project", "new Dashboard")
    mission_service.dispatch("mission", "new Audit")
    created = mission_service.dispatch("task", "new Review")
    task_id = created.split("(", 1)[1].split(")", 1)[0]
    assert "running" in mission_service.dispatch("task", f"start {task_id}")
    assert "paused" in mission_service.dispatch("task", f"pause {task_id}")
    assert "completed" in mission_service.dispatch("task", f"complete {task_id}")
    stored = mission_service.store.get("mission", "task", task_id)
    assert stored.status == "completed"


def test_client_provisioner_reports_real_partial_state(mission_service):
    mission_service.dispatch("client", "new Moonbase")
    result = mission_service.dispatch("client", "provision")
    assert "CLIENT PROVISIONER · Moonbase" in result
    assert "✓ identity" in result
    assert "○ github" in result
    assert "PARTIAL" in result
    assert "READY" not in result.splitlines()[-1]


def test_client_runtime_mode_is_persisted_and_audited(mission_service):
    mission_service.dispatch("client", "new Moonbase")
    assert "→ hybrid" in mission_service.dispatch("client", "runtime set hybrid")
    assert "Runtime: hybrid" in mission_service.dispatch("client", "runtime")
    with mission_service.store.connect() as db:
        event = db.execute(
            "SELECT action,payload_json FROM events WHERE action='client.metadata.updated'"
        ).fetchone()
    assert event is not None
    assert "runtime" in event["payload_json"]


def test_client_nested_task_alias_uses_current_hierarchy(mission_service):
    mission_service.dispatch("client", "new Moonbase")
    mission_service.dispatch("client", "project new Dashboard")
    mission_service.dispatch("client", "mission new Audit")
    result = mission_service.dispatch("client", "task new Review")
    assert "Task created: Review" in result


def test_client_connector_never_accepts_credentials_in_chat(mission_service):
    mission_service.dispatch("client", "new Moonbase")
    result = mission_service.dispatch("client", "github connect secret-token")
    assert "secure Github connector flow" in result
    assert "secret-token" not in result


def test_root_slug_is_unique_even_with_null_parent(mission_service):
    mission_service.store.create(
        environment="mission", kind="client", slug="moonbase", name="Moonbase"
    )
    with pytest.raises(Exception, match="UNIQUE constraint failed"):
        mission_service.store.create(
            environment="mission", kind="client", slug="moonbase", name="Moonbase"
        )
    assert len(mission_service.store.list("mission", "client")) == 1


def test_parent_cannot_cross_environment(tmp_path):
    store = ControlStore(tmp_path / "control.db")
    client = store.create(
        environment="mission", kind="client", slug="moonbase", name="Moonbase"
    )
    with pytest.raises(PermissionError):
        store.create(
            environment="agentik", kind="project", slug="dashboard",
            name="Dashboard", parent_id=client.id,
        )


def test_opening_child_by_id_restores_its_complete_canonical_lineage(mission_service):
    mission_service.dispatch("client", "new Alpha")
    alpha_project = mission_service.dispatch("project", "new Dashboard")
    alpha_id = alpha_project.split("(", 1)[1].split(")", 1)[0]
    mission_service.dispatch("client", "new Beta")
    mission_service.dispatch("project", "new Dashboard")

    result = mission_service.dispatch("project", f"open {alpha_id}")
    assert "Opened project" in result
    context = mission_service.context()
    alpha = mission_service.store.get("mission", "client", "alpha")
    assert context["client_id"] == alpha.id
    assert context["project_id"] == alpha_id


def test_run_is_part_of_context_and_active_report(mission_service):
    mission_service.dispatch("client", "new Moonbase")
    mission_service.dispatch("project", "new Dashboard")
    mission_service.dispatch("mission", "new Audit")
    mission_service.dispatch("task", "new Review")
    created = mission_service.dispatch("run", "new Worker")
    run_id = created.split("(", 1)[1].split(")", 1)[0]
    assert mission_service.context()["run_id"] == run_id
    assert f"Run: Worker ({run_id})" in mission_service.dispatch("active", "")
