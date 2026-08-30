import json
import zipfile
from pathlib import Path

import pytest

from plugins.agentik_os.os_registry import OSRegistry, inspect_zip, resolve_assignments, validate_manifest


VALID = {"id": "research-os", "name": "Research OS", "version": "1.2.3", "description": "Method", "scope": ["agentik", "mission"]}


def write_zip(path: Path, files: dict[str, str]) -> None:
    with zipfile.ZipFile(path, "w") as archive:
        for name, content in files.items():
            archive.writestr(name, content)


def test_inspect_zip_reads_manifest_without_extracting(tmp_path):
    package = tmp_path / "os.zip"
    write_zip(package, {"research/manifest.yaml": "\n".join(f"{k}: {json.dumps(v)}" for k, v in VALID.items()), "research/docs.md": "safe"})
    inspected = inspect_zip(package)
    assert inspected.manifest["id"] == "research-os"
    assert not (tmp_path / "research").exists()


def test_inspect_zip_rejects_path_traversal(tmp_path):
    package = tmp_path / "bad.zip"
    write_zip(package, {"../manifest.yaml": "id: bad"})
    with pytest.raises(ValueError, match="unsafe archive path"):
        inspect_zip(package)


def test_manifest_rejects_unknown_scope():
    with pytest.raises(ValueError, match="allowed scopes"):
        validate_manifest({**VALID, "scope": ["root"]})


def test_empty_registry_doctor_is_truthful(tmp_path):
    (tmp_path / "state").mkdir()
    (tmp_path / "state/index.json").write_text('{"schema_version":1,"packages":[]}', encoding="utf-8")
    healthy, errors = OSRegistry(tmp_path).doctor()
    assert healthy and errors == []


def test_assignment_resolution_is_ordered_and_scoped():
    records = [
        {"os": "global-os@1.0.0", "scope": "global", "target": "global"},
        {"os": "client-os@1.0.0", "scope": "client", "target": "moonbase"},
        {"os": "wrong@1.0.0", "scope": "client", "target": "other"},
        {"os": "project-os@1.0.0", "scope": "project", "target": "dashboard"},
    ]
    stack = resolve_assignments(records, {"client_id": "moonbase", "project_id": "dashboard"})
    assert stack == ["global-os@1.0.0", "client-os@1.0.0", "project-os@1.0.0"]
