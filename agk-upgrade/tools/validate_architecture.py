#!/usr/bin/env python3
"""Fail-closed validation for the AGK architecture SSOT."""

from __future__ import annotations

import ast
import hashlib
import json
import os
import re
import subprocess
import tempfile
from collections import Counter
from functools import lru_cache
from pathlib import Path, PurePosixPath
from typing import Any

import yaml

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO / "agk-upgrade"
OUT = ROOT / "validation"
AGK_REPO = Path(os.environ.get("AGK_CANON_REPO", "/Users/hacker/Projects/AGK-OS"))

EXPECTED_HERMES_COMMIT = "8794e5a21c980a0f26532cb4883284b786cb3f25"
EXPECTED_AGK_COMMIT = "a0a3284edfb21eeeec77d9e185b98ef05dbada0a"
EXPECTED_PROMPT_SHA = "6e003f053b03e0c912fac8a4a50cd57a899593f2f86cd54eb4b1e0936181e207"
EXPECTED_AUDIT_EVIDENCE_MANIFEST_SHA = "8280dd2b60936e664ece2dacdffc9116d6388ea52055edd70b6e329db2447b56"
EXPECTED_SURFACES = ["learn", "build", "deals", "self"]
EXPECTED_OS_PARTS = [
    "Purpose", "Principles", "Commands", "Flows", "Agents", "Skills", "Tools",
    "Knowledge", "Memory", "Policies", "Inputs", "Outputs", "Evals",
    "Quality Gates", "Dependencies", "Versions",
]
EXPECTED_PROJECT_STAGES = [
    "IDEA", "DISCOVERY", "BLUEPRINT", "ROADMAP", "BUILD", "VERIFY",
    "RELEASE", "OPERATE", "IMPROVE",
]
EXPECTED_STRATEGIC_LOOP = [
    "LEARN / DISCOVER", "BUILD", "PROVE", "APPLY", "CAPTURE LEARNING", "IMPROVE",
]
EXPECTED_DEALS_CHAIN = ["Opportunity", "Deal", "Engagement", "Contract", "Project"]
EXPECTED_CLIENT_STACK = {
    "reference": "agk-web",
    "desktop_wrapper": "Tauri",
    "mobile": "Expo",
    "hermes_electron_role": "runtime_console_and_behavior_reference",
}
FORBIDDEN_DERIVED_HEX = [
    "52756e74696d65576f726b737061636542696e64696e67",
    "50726f6a6563745265706f7369746f727942696e64696e67",
    "506f7274666f6c696f2045766964656e6365",
    "506f7274666f6c696f45766964656e6365",
    "43617365205374756479",
    "436173655374756479",
    "4175746f6d6174696f6e446566696e6974696f6e",
    "4175746f6d6174696f6e4465706c6f796d656e74",
    "5472696767657246697265417474656d7074",
    "52756e417474656d7074",
]
ALLOWED_DECISIONS = {"REUSE", "EXTEND", "WRAP", "ADAPT", "REPLACE", "NEW", "DEFER"}
ALLOWED_TASK_STATUSES = {"PLANNED", "DEFERRED"}
ALLOWED_PRIORITIES = {"P0", "P1", "P2", "P3", "P4"}
REQUIRED_MAP_KEYS = {
    "organization", "project", "agent", "oracle", "team", "workforce", "os",
    "skill", "tool", "mcp", "prompt", "model_routing", "session", "runtime",
    "machine_and_environment", "scheduler", "automation", "subagents", "kanban",
    "memory", "knowledge", "artifact", "events", "observability", "evaluation",
    "permissions", "communication", "canvas", "product_surfaces", "packages",
    "architect", "labs",
}
REQUIRED_CAPABILITY_KEYS = {
    "agent_loop", "prompt_assembly", "provider_routing", "credential_pools",
    "tool_registry", "skills", "memory", "context_engine", "session_storage",
    "projects", "subagents", "kanban", "cron", "session_goals_and_loops", "mcp",
    "native_plugins", "portable_agent_plugins", "execution_environments", "filesystem",
    "browser", "gateway", "hooks_and_events", "desktop", "desktop_plugin_sdk",
    "web_dashboard", "tui", "acp", "profiles", "logging_and_monitoring",
    "trajectories_and_evals", "artifacts", "knowledge",
    "organizations_oracles_workforces_os", "code_execution", "background_processes",
}

REQUIRED = [
    "README.md", "DECISIONS.md", "TRACEABILITY.md", "PROMPT_COMPLETION_MATRIX.md",
    "PROMPT_COMPLETION_MATRIX.json", "ARCHITECTURE_MANIFEST.yaml",
    "agk-hermes-map.yaml", "AGK_HERMES_MASTER_BLUEPRINT.md",
    "AGK_POST_STEPPER_ALIGNMENT_REPORT.md", "00-input/OPERATOR_PROMPT.md",
    "00-input/SOURCE_MANIFEST.json", "00-input/CANONICAL_RECONCILIATION.md",
    "00-input/CANONICAL_CONTRACTS.yaml", "00-input/AGK_BUILD_GATE_BASELINE.json",
    "00-input/AGK_PREBUILD_SUMMARY_BASELINE.json",
    "01-hermes-audit/CAPABILITY_MAP.md", "01-hermes-audit/ARCHITECTURE_MAP.md",
    "01-hermes-audit/RUNTIME_MAP.md", "01-hermes-audit/TOOLS_MAP.md",
    "01-hermes-audit/SKILLS_MAP.md", "01-hermes-audit/MEMORY_MAP.md",
    "01-hermes-audit/SUBAGENTS_MAP.md", "01-hermes-audit/MCP_MAP.md",
    "01-hermes-audit/PROVIDERS_MAP.md", "01-hermes-audit/SANDBOX_MAP.md",
    "01-hermes-audit/GATEWAYS_MAP.md", "01-hermes-audit/SCHEDULER_MAP.md",
    "01-hermes-audit/BROWSER_MAP.md", "01-hermes-audit/CONFIG_MAP.md",
    "01-hermes-audit/EXTENSION_POINTS.md", "01-hermes-audit/LIMITATIONS.md",
    "01-hermes-audit/TECHNICAL_DEBT.md", "01-hermes-audit/hermes-capabilities.yaml",
    "01-hermes-audit/REPOSITORY_INVENTORY.json",
    "01-hermes-audit/INDEPENDENT_FINDINGS.md",
    "01-hermes-audit/evidence/MANIFEST.json",
    "02-agk-spec/AGK_VISION.md", "02-agk-spec/AGK_ONTOLOGY.md",
    "02-agk-spec/AGK_ARCHITECTURE.md", "02-agk-spec/AGK_OBJECT_MODEL.md",
    "02-agk-spec/AGK_RUNTIME_CONTRACT.md", "02-agk-spec/AGK_CONTROL_PLANE.md",
    "02-agk-spec/AGK_PROJECT_MODEL.md", "02-agk-spec/AGK_AGENT_MODEL.md",
    "02-agk-spec/AGK_ORACLE_MODEL.md", "02-agk-spec/AGK_TEAM_MODEL.md",
    "02-agk-spec/AGK_WORKFORCE_MODEL.md", "02-agk-spec/AGK_OS_MODEL.md",
    "02-agk-spec/AGK_MEMORY_MODEL.md", "02-agk-spec/AGK_KNOWLEDGE_MODEL.md",
    "02-agk-spec/AGK_ARTIFACT_MODEL.md", "02-agk-spec/AGK_LABS_MODEL.md",
    "02-agk-spec/AGK_FLOW_MODEL.md", "02-agk-spec/AGK_GRAPH_MODEL.md",
    "02-agk-spec/AGK_LOOP_MODEL.md", "02-agk-spec/AGK_AUTOMATION_MODEL.md",
    "02-agk-spec/AGK_HARNESS_MODEL.md", "02-agk-spec/AGK_TOOL_MODEL.md",
    "02-agk-spec/AGK_SKILL_MODEL.md", "02-agk-spec/AGK_PROMPT_MODEL.md",
    "02-agk-spec/AGK_MODEL_ROUTING.md", "02-agk-spec/AGK_OBSERVABILITY.md",
    "02-agk-spec/AGK_EVALUATION.md", "02-agk-spec/AGK_GOVERNANCE.md",
    "02-agk-spec/AGK_SECURITY.md", "02-agk-spec/AGK_PERMISSIONS.md",
    "02-agk-spec/AGK_VERSIONING.md", "03-gap-analysis/FEATURE_MATRIX.md",
    "03-gap-analysis/ONTOLOGY_MAPPING.md", "03-gap-analysis/CAPABILITY_GAPS.md",
    "03-gap-analysis/DUPLICATION_RISKS.md", "03-gap-analysis/SEMANTIC_CONFLICTS.md",
    "03-gap-analysis/REUSE_PLAN.md", "03-gap-analysis/EXTENSION_PLAN.md",
    "03-gap-analysis/REWRITE_DECISIONS.md", "04-upstream-strategy/UPSTREAM_POLICY.md",
    "04-upstream-strategy/PATCH_POLICY.md", "04-upstream-strategy/MERGE_STRATEGY.md",
    "04-upstream-strategy/HERMES_FILES_MODIFIED.md",
    "04-upstream-strategy/AGK_EXTENSION_POINTS.md",
    "04-upstream-strategy/UPGRADE_PLAYBOOK.md", "05-roadmap/ROADMAP.md",
    "05-roadmap/DEPENDENCY_GRAPH.md", "05-roadmap/PRIORITY_MATRIX.md",
    "05-roadmap/roadmap.yaml", "06-implementation/tasks.json",
    "07-post-stepper-alignment/REFINED_VISION_DIFF.md",
    "07-post-stepper-alignment/STEPPER_IMPACT_ANALYSIS.md",
    "07-post-stepper-alignment/ONTOLOGY_CORRECTIONS.md",
    "07-post-stepper-alignment/OS_ARCHITECTURE_ALIGNMENT.md",
    "07-post-stepper-alignment/CANVAS_ALIGNMENT.md",
    "07-post-stepper-alignment/LEARN_ALIGNMENT.md",
    "07-post-stepper-alignment/COMMUNITY_ALIGNMENT.md",
    "07-post-stepper-alignment/DEALS_ALIGNMENT.md",
    "07-post-stepper-alignment/SELF_ALIGNMENT.md",
    "07-post-stepper-alignment/SHARED_PLATFORM_ALIGNMENT.md",
    "07-post-stepper-alignment/MIGRATION_DECISIONS.md",
    "07-post-stepper-alignment/UPDATED_DEPENDENCY_GRAPH.md",
    "07-post-stepper-alignment/IMPLEMENTATION_CHANGESET.md",
    "tools/validate_architecture.py", "tools/test_validate_architecture.py",
    "validation/TEST_EVIDENCE.json", "validation/TEST_EVIDENCE.md", "validation/REMEDIATION_LOG.md",
    "validation/FINAL_REVIEW_MANIFEST.json", "validation/FINAL_INDEPENDENT_REVIEW.md",
    "validation/VALIDATION_RESULTS.json", "validation/VALIDATION_RESULTS.md",
]

TASK_HEADINGS = [
    "## Objective", "## Why it exists", "## Hermes capabilities reused",
    "## Files inspected", "## Files to create", "## Files to modify",
    "## Schemas", "## Interfaces", "## API impact", "## Migration impact",
    "## Tests", "## Acceptance criteria", "## Risks", "## Dependencies",
]


class UniqueKeyLoader(yaml.SafeLoader):
    pass


def _unique_mapping(loader: UniqueKeyLoader, node: yaml.Node, deep: bool = False) -> dict[Any, Any]:
    result: dict[Any, Any] = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError(f"duplicate YAML key: {key}")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueKeyLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _unique_mapping)


def _unique_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def strict_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_unique_pairs)


def strict_yaml(path: Path) -> Any:
    return yaml.load(path.read_text(encoding="utf-8"), Loader=UniqueKeyLoader)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*args: str, cwd: Path = REPO) -> str:
    return subprocess.check_output(["git", *args], cwd=cwd, text=True).strip()


def atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(text)
        temp_path = Path(handle.name)
    os.replace(temp_path, path)


def add(checks: list[dict[str, Any]], check_id: str, passed: bool, evidence: str) -> None:
    checks.append({"id": check_id, "status": "PASS" if passed else "FAIL", "evidence": evidence})


def write_report(checks: list[dict[str, Any]], *, forced_status: str | None = None) -> dict[str, Any]:
    status = forced_status or ("PASS" if checks and all(c["status"] == "PASS" for c in checks) else "FAIL")
    report = {
        "schema_version": "2.0.0",
        "status": status,
        "passed": sum(c["status"] == "PASS" for c in checks),
        "failed": sum(c["status"] == "FAIL" for c in checks),
        "production_implementation_allowed": False,
        "checks": checks,
    }
    lines = [
        "# AGK Upgrade Architecture Validation", "", f"Status: **{status}**", "",
        f"Passed: {report['passed']}", f"Failed: {report['failed']}", "",
        "Product implementation remains disabled.", "", "| Check | Status | Evidence |",
        "|---|---|---|",
    ]
    for check in checks:
        evidence = str(check["evidence"]).replace("|", "\\|").replace("\n", " ")
        lines.append(f"| {check['id']} | {check['status']} | {evidence} |")
    atomic_write(OUT / "VALIDATION_RESULTS.md", "\n".join(lines) + "\n")
    # JSON is the authoritative machine verdict and is published last. A
    # partial report write can therefore never leave a stale machine PASS.
    atomic_write(OUT / "VALIDATION_RESULTS.json", json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    return report


def dependency_cycles(records: list[dict[str, Any]], dependency_key: str = "dependencies") -> tuple[list[str], list[str], list[str]]:
    ids = [str(record.get("id", "")) for record in records]
    duplicates = sorted(key for key, count in Counter(ids).items() if count > 1)
    known = set(ids)
    unknown: list[str] = []
    graph: dict[str, list[str]] = {}
    for record in records:
        rid = str(record.get("id", ""))
        deps = [str(dep) for dep in record.get(dependency_key, [])]
        unknown.extend(f"{rid}->{dep}" for dep in deps if dep not in known)
        if rid not in graph:
            graph[rid] = [dep for dep in deps if dep in known]
    visiting: set[str] = set()
    visited: set[str] = set()
    cycles: list[str] = []

    def walk(node: str, trail: list[str]) -> None:
        if node in visiting:
            start = trail.index(node) if node in trail else 0
            cycles.append("->".join(trail[start:] + [node]))
            return
        if node in visited:
            return
        visiting.add(node)
        for dep in graph.get(node, []):
            walk(dep, trail + [node])
        visiting.remove(node)
        visited.add(node)

    for node in sorted(graph):
        walk(node, [])
    return duplicates, sorted(set(unknown)), sorted(set(cycles))


def safe_relative(value: str, base: Path) -> Path | None:
    pure = PurePosixPath(value)
    if pure.is_absolute() or ".." in pure.parts or not value:
        return None
    path = (base / pure).resolve()
    try:
        path.relative_to(base.resolve())
    except ValueError:
        return None
    return path


def source_files_for(refs: list[str]) -> tuple[list[Path], list[str]]:
    files: list[Path] = []
    errors: list[str] = []
    for ref in refs:
        rel, _, _ = str(ref).partition("::")
        path = REPO / rel
        if not path.exists():
            errors.append(f"{ref}:missing")
        elif path.is_dir():
            files.extend(p for p in path.rglob("*") if p.is_file() and p.suffix in {".py", ".ts", ".tsx", ".js", ".mjs"})
        else:
            files.append(path)
    return sorted(set(files)), errors


def defined_names(files: list[Path]) -> tuple[set[str], str]:
    names: set[str] = set()
    texts: list[str] = []
    for path in files:
        text = path.read_text(encoding="utf-8", errors="replace")
        texts.append(text)
        if path.suffix == ".py":
            try:
                tree = ast.parse(text)
            except SyntaxError:
                continue
            for node in ast.walk(tree):
                if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                    names.add(node.name)
        else:
            names.update(re.findall(r"(?:class|function|interface|const|let|var)\s+([$A-Za-z_][$\w]*)", text))
    return names, "\n".join(texts)


@lru_cache(maxsize=256)
def source_metadata(refs: tuple[str, ...]) -> tuple[frozenset[str], str, tuple[str, ...]]:
    files, errors = source_files_for(list(refs))
    names, combined = defined_names(files)
    return frozenset(names), combined, tuple(errors)


def component_reference_errors(refs: list[str], classes: list[str] | None, functions: list[str] | None, prefix: str) -> list[str]:
    names, combined, source_errors = source_metadata(tuple(refs))
    errors = list(source_errors)
    for declared in classes or []:
        leaf = str(declared).split(".")[-1].lstrip("$")
        if leaf not in names:
            errors.append(f"{prefix}:class:{declared}")
    for declared in functions or []:
        leaf = str(declared).split(".")[-1].lstrip("$")
        if leaf not in names and not re.search(rf"(?<![\w$]){re.escape(leaf)}(?![\w$])", combined):
            errors.append(f"{prefix}:function:{declared}")
    for ref in refs:
        _, separator, symbol = str(ref).partition("::")
        if separator:
            leaf = symbol.split(".")[-1].lstrip("$")
            if leaf not in names and not re.search(rf"(?<![\w$]){re.escape(leaf)}(?![\w$])", combined):
                errors.append(f"{prefix}:symbol:{ref}")
    return errors


def markdown_source_reference_errors() -> list[str]:
    errors: list[str] = []
    docs = list((ROOT / "01-hermes-audit").glob("*.md")) + [ROOT / "04-upstream-strategy/AGK_EXTENSION_POINTS.md"]
    token_pattern = re.compile(r"`([^`\n]+)`")
    candidate = re.compile(r"^(?:[A-Za-z0-9_.-]+/)*[A-Za-z0-9_.-]+\.(?:py|ts|tsx|js|mjs|md|json|yaml|yml)(?:::[A-Za-z0-9_.$-]+)?$")
    for doc in docs:
        for token in token_pattern.findall(doc.read_text(encoding="utf-8")):
            value = token.strip().rstrip(".,;:")
            if not candidate.match(value):
                continue
            rel, _, symbol = value.partition("::")
            path = REPO / rel
            if not path.exists() and "/" not in rel:
                path = doc.parent / rel
            if not path.exists():
                errors.append(f"{doc.relative_to(ROOT)}:{value}:missing")
                continue
            if symbol and path.is_file():
                names, combined = defined_names([path])
                leaf = symbol.split(".")[-1].lstrip("$")
                if leaf not in names and not re.search(rf"(?<![\w$]){re.escape(leaf)}(?![\w$])", combined):
                    errors.append(f"{doc.relative_to(ROOT)}:{value}:symbol")
    return errors


@lru_cache(maxsize=1)
def observed_inventory() -> dict[str, int]:
    tracked = [item for item in subprocess.check_output(["git", "ls-files", "-z"], cwd=REPO).split(b"\0") if item]
    tool_count = 0
    for path in (REPO / "tools").glob("*.py"):
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"))
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute) or node.func.attr != "register":
                continue
            keyword = next((item.value for item in node.keywords if item.arg == "name"), None)
            if isinstance(keyword, ast.Constant) and isinstance(keyword.value, str):
                tool_count += 1
    environment_count = 0
    for path in (REPO / "tools/environments").glob("*.py"):
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"))
        except SyntaxError:
            continue
        environment_count += sum(
            isinstance(node, ast.ClassDef) and node.name.endswith("Environment") and not node.name.startswith("Base")
            for node in tree.body
        )

    def directory_count(relative: str) -> int:
        return sum(path.is_dir() and not path.name.startswith((".", "__")) for path in (REPO / relative).iterdir())

    return {
        "tracked_file_count": len(tracked),
        "literal_builtin_tool_count": tool_count,
        "model_provider_plugin_directory_count": directory_count("plugins/model-providers"),
        "memory_provider_directory_count": directory_count("plugins/memory"),
        "platform_plugin_directory_count": directory_count("plugins/platforms"),
        "concrete_environment_count": environment_count,
    }


def markdown_quality_errors(paths: list[Path]) -> list[str]:
    errors: list[str] = []
    for path in paths:
        text = path.read_text(encoding="utf-8", errors="replace")
        rel = path.resolve().relative_to(ROOT.resolve()).as_posix()
        words = re.findall(r"[A-Za-z][A-Za-z0-9_-]{2,}", text)
        alpha_ratio = sum(char.isalpha() for char in text) / max(1, len(text))
        if len(text.encode()) < 180 or not re.search(r"(?m)^#", text) or len(set(word.casefold() for word in words)) < 15 or alpha_ratio < 0.20:
            errors.append(rel)
    return errors


def parse_porcelain_z(raw: bytes) -> list[str]:
    records = raw.split(b"\0")
    paths: list[str] = []
    index = 0
    while index < len(records):
        record = records[index]
        index += 1
        if not record:
            continue
        text = record.decode("utf-8", "replace")
        status = text[:2]
        paths.append(text[3:] if len(text) > 3 else "")
        if "R" in status or "C" in status:
            if index < len(records) and records[index]:
                paths.append(records[index].decode("utf-8", "replace"))
                index += 1
    return paths


def parse_status_paths() -> list[str]:
    raw = subprocess.check_output(
        ["git", "-c", "status.showUntrackedFiles=all", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
        cwd=REPO,
    )
    return parse_porcelain_z(raw)


def run_checks(prior_exists: dict[str, bool]) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []

    dynamic_task_files = sorted(path.resolve() for path in (ROOT / "06-implementation").glob("[0-9][0-9][0-9]-*.md"))
    missing = [rel for rel in REQUIRED if not prior_exists.get(rel, False)]
    add(checks, "A01_REQUIRED_ARTIFACTS", not missing, f"missing={missing}")
    if missing:
        return checks

    parsed: dict[Path, Any] = {}
    parse_errors: list[str] = []
    for path in sorted(ROOT.rglob("*.json")):
        try:
            parsed[path] = strict_json(path)
        except Exception as exc:
            parse_errors.append(f"{path.relative_to(ROOT)}:{type(exc).__name__}:{exc}")
    for path in sorted([*ROOT.rglob("*.yaml"), *ROOT.rglob("*.yml")]):
        try:
            parsed[path] = strict_yaml(path)
        except Exception as exc:
            parse_errors.append(f"{path.relative_to(ROOT)}:{type(exc).__name__}:{exc}")
    add(checks, "A02_MACHINE_FORMATS_AND_UNIQUE_KEYS", not parse_errors, f"errors={parse_errors[:20]}")

    manifest = parsed.get(ROOT / "ARCHITECTURE_MANIFEST.yaml", {})
    source = parsed.get(ROOT / "00-input/SOURCE_MANIFEST.json", {})
    canon = parsed.get(ROOT / "00-input/CANONICAL_CONTRACTS.yaml", {})
    mapping = parsed.get(ROOT / "agk-hermes-map.yaml", {})
    capability_doc = parsed.get(ROOT / "01-hermes-audit/hermes-capabilities.yaml", {})
    inventory = parsed.get(ROOT / "01-hermes-audit/REPOSITORY_INVENTORY.json", {})
    roadmap = parsed.get(ROOT / "05-roadmap/roadmap.yaml", {})
    task_index = parsed.get(ROOT / "06-implementation/tasks.json", {})
    test_evidence = parsed.get(ROOT / "validation/TEST_EVIDENCE.json", {})
    final_review = parsed.get(ROOT / "validation/FINAL_REVIEW_MANIFEST.json", {})
    prompt_matrix = parsed.get(ROOT / "PROMPT_COMPLETION_MATRIX.json", {})

    manifest_shape = isinstance(manifest, dict) and manifest.get("schema_version") == "1.0.0"
    surface_ids = [item.get("id") for item in manifest.get("canonical_surfaces", [])] if manifest_shape else []
    section_statuses = {key: value.get("status") for key, value in manifest.get("sections", {}).items()} if manifest_shape else {}
    expected_sections = {"hermes_audit", "agk_spec", "gap_analysis", "upstream_strategy", "roadmap", "implementation_tasks", "post_stepper_alignment"}
    manifest_ok = (
        manifest_shape
        and manifest.get("baseline", {}).get("hermes_commit") == EXPECTED_HERMES_COMMIT
        and manifest.get("baseline", {}).get("agk_commit") == EXPECTED_AGK_COMMIT
        and manifest.get("baseline", {}).get("operator_prompt_sha256") == EXPECTED_PROMPT_SHA
        and manifest.get("phase") == "architecture_analysis"
        and manifest.get("production_implementation_allowed") is False
        and manifest.get("build_gate", {}).get("status") == "CLOSED"
        and surface_ids == EXPECTED_SURFACES
        and set(manifest.get("classifications", [])) == ALLOWED_DECISIONS
        and set(section_statuses) == expected_sections
        and all(status != "planned" for status in section_statuses.values())
        and {"README.md", "ARCHITECTURE_MANIFEST.yaml", "DECISIONS.md", "TRACEABILITY.md", "PROMPT_COMPLETION_MATRIX.md", "PROMPT_COMPLETION_MATRIX.json", "agk-hermes-map.yaml", "AGK_HERMES_MASTER_BLUEPRINT.md", "AGK_POST_STEPPER_ALIGNMENT_REPORT.md"}.issubset(set(manifest.get("root_deliverables", [])))
    )
    add(checks, "A03_ARCHITECTURE_MANIFEST", manifest_ok, f"surfaces={surface_ids}, sections={section_statuses}")

    expected_canon = {
        "surfaces": EXPECTED_SURFACES,
        "os_parts": EXPECTED_OS_PARTS,
        "os_installation_scopes": ["organization", "project", "os"],
        "os_installation_objects": ["OSInstallation", "OrganizationOSInstallation", "ProjectOSBinding", "OSBinding"],
        "project_stages": EXPECTED_PROJECT_STAGES,
        "run_states": ["queued", "running", "succeeded", "failed", "cancelled", "timed_out"],
        "strategic_loop": EXPECTED_STRATEGIC_LOOP,
        "deals_chain": EXPECTED_DEALS_CHAIN,
        "client_stack": EXPECTED_CLIENT_STACK,
        "automation_contract": "Trigger + executable target + policy",
        "flow_canvas_modes": ["Build", "Live", "Debug", "Replay", "Analytics", "Cost", "Quality"],
        "organization_canvas_overlays": ["Design", "Live", "Inspect"],
        "forbidden_derived_term_hex": FORBIDDEN_DERIVED_HEX,
    }
    canon_errors = [key for key, expected in expected_canon.items() if canon.get(key) != expected]
    add(checks, "A04_CANONICAL_CONTRACT_SNAPSHOT", isinstance(canon, dict) and not canon_errors, f"errors={canon_errors}")

    provenance_errors: list[str] = []
    if not isinstance(source, dict):
        provenance_errors.append("source_manifest_shape")
    else:
        prompt = source.get("operator_prompt", {})
        if prompt.get("path") != "agk-upgrade/00-input/OPERATOR_PROMPT.md" or prompt.get("sha256") != EXPECTED_PROMPT_SHA:
            provenance_errors.append("prompt_manifest")
        prompt_path = safe_relative(str(prompt.get("path", "")), REPO)
        if prompt_path is None or not prompt_path.is_file() or prompt_path.stat().st_size != prompt.get("bytes") or sha256(prompt_path) != EXPECTED_PROMPT_SHA:
            provenance_errors.append("prompt_bytes")
        hermes_source = source.get("hermes_baseline", {})
        agk_source = source.get("agk_baseline", {})
        if hermes_source.get("repository") != "https://github.com/NousResearch/hermes-agent.git" or hermes_source.get("commit") != EXPECTED_HERMES_COMMIT:
            provenance_errors.append("hermes_pin")
        audit_manifest = hermes_source.get("independent_audit_evidence_manifest", {})
        if audit_manifest.get("path") != "agk-upgrade/01-hermes-audit/evidence/MANIFEST.json" or audit_manifest.get("sha256") != EXPECTED_AUDIT_EVIDENCE_MANIFEST_SHA:
            provenance_errors.append("audit_evidence_pin")
        if agk_source.get("repository") != "https://github.com/agentik-os/AGK-OS.git" or agk_source.get("commit") != EXPECTED_AGK_COMMIT:
            provenance_errors.append("agk_pin")
        for key in ("build_gate_snapshot", "prebuild_summary_snapshot", "canonical_contracts"):
            item = agk_source.get(key, {})
            item_path = safe_relative(str(item.get("path", "")), REPO)
            if item_path is None or not item_path.is_file() or sha256(item_path) != item.get("sha256"):
                provenance_errors.append(key)
        if not AGK_REPO.is_dir():
            provenance_errors.append("agk_checkout_missing")
        else:
            if git("rev-parse", "HEAD", cwd=AGK_REPO) != EXPECTED_AGK_COMMIT:
                provenance_errors.append("agk_head")
            expected_sources = {entry.get("path"): entry.get("sha256") for entry in agk_source.get("canonical_sources", [])}
            if len(expected_sources) != 8:
                provenance_errors.append("canonical_source_count")
            for rel, digest in expected_sources.items():
                path = safe_relative(str(rel), AGK_REPO)
                if path is None or not path.is_file() or sha256(path) != digest:
                    provenance_errors.append(f"canonical_source:{rel}")
    add(checks, "A05_SOURCE_PROVENANCE", not provenance_errors, f"errors={provenance_errors}")

    gate = parsed.get(ROOT / "00-input/AGK_BUILD_GATE_BASELINE.json", {})
    summary = parsed.get(ROOT / "00-input/AGK_PREBUILD_SUMMARY_BASELINE.json", {})
    gate_ok = (
        isinstance(gate, dict) and gate.get("status") == "CLOSED"
        and gate.get("build_enabled") is False
        and gate.get("execution_scope", {}).get("admitted_step_ids") == []
        and isinstance(summary, dict) and summary.get("audit_result") == "PASS"
        and summary.get("product_build_disabled") is True
    )
    add(checks, "A06_CLOSED_BUILD_GATE", gate_ok, f"gate={getattr(gate, 'get', lambda *_: None)('status') if isinstance(gate, dict) else None}")

    mapping_entries = mapping.get("agk", {}) if isinstance(mapping, dict) else {}
    map_errors: list[str] = []
    if set(mapping_entries) != REQUIRED_MAP_KEYS:
        map_errors.append("keys")
    for name, entry in mapping_entries.items():
        if not isinstance(entry, dict) or entry.get("strategy") not in ALLOWED_DECISIONS or not isinstance(entry.get("hermes"), dict):
            map_errors.append(f"{name}:shape")
            continue
        components = entry["hermes"].get("components", [])
        if not isinstance(components, list):
            map_errors.append(f"{name}:components")
        else:
            map_errors.extend(component_reference_errors(components, [], [], f"map:{name}"))
        if not components and not str(entry["hermes"].get("coverage", "")).startswith("absent"):
            map_errors.append(f"{name}:empty_components")
    add(checks, "A07_AGK_HERMES_MAPPING", not map_errors, f"entries={len(mapping_entries)}, errors={map_errors[:20]}")

    capabilities = capability_doc.get("capabilities", {}) if isinstance(capability_doc, dict) else {}
    cap_errors: list[str] = []
    if set(capabilities) != REQUIRED_CAPABILITY_KEYS:
        cap_errors.append("keys")
    if capability_doc.get("baseline_commit") != EXPECTED_HERMES_COMMIT or set(capability_doc.get("decision_axes", {})) != {"mechanics_disposition", "agk_strategy", "maps_to"}:
        cap_errors.append("metadata")
    for name, entry in capabilities.items():
        required_keys = {"status", "implementation", "capabilities", "limitations", "agk_relevance", "maps_to", "agk_strategy", "mechanics_disposition"}
        if not isinstance(entry, dict) or not required_keys.issubset(entry):
            cap_errors.append(f"{name}:shape")
            continue
        target = entry.get("maps_to")
        if target not in mapping_entries or entry.get("agk_strategy") not in ALLOWED_DECISIONS or entry.get("mechanics_disposition") not in ALLOWED_DECISIONS:
            cap_errors.append(f"{name}:decision")
        elif entry.get("agk_strategy") != mapping_entries[target].get("strategy"):
            cap_errors.append(f"{name}:crosswalk")
        impl = entry.get("implementation", {})
        if not isinstance(impl, dict) or not all(isinstance(impl.get(key), list) for key in ("files", "classes", "functions")):
            cap_errors.append(f"{name}:implementation")
        else:
            cap_errors.extend(component_reference_errors(impl["files"], impl["classes"], impl["functions"], f"capability:{name}"))
    add(checks, "A08_HERMES_CAPABILITY_REGISTRY", not cap_errors, f"entries={len(capabilities)}, errors={cap_errors[:30]}")

    observed = observed_inventory()
    expected_observed = {
        "tracked_file_count": 9938,
        "literal_builtin_tool_count": 92,
        "model_provider_plugin_directory_count": 36,
        "memory_provider_directory_count": 8,
        "platform_plugin_directory_count": 22,
        "concrete_environment_count": 8,
    }
    inventory_ok = (
        isinstance(inventory, dict) and inventory.get("schema_version") == "1.1.0"
        and inventory.get("baseline_commit") == EXPECTED_HERMES_COMMIT
        and observed == expected_observed
        and all(inventory.get(key) == value for key, value in observed.items())
        and all("." not in name for name in inventory.get("model_provider_plugin_directories", []))
        and all("." not in name for name in inventory.get("memory_provider_directories", []))
    )
    add(checks, "A09_REPOSITORY_INVENTORY", inventory_ok, f"observed={observed}")

    evidence = parsed.get(ROOT / "01-hermes-audit/evidence/MANIFEST.json", {})
    evidence_errors: list[str] = []
    reports = evidence.get("reports", []) if isinstance(evidence, dict) else []
    if sha256(ROOT / "01-hermes-audit/evidence/MANIFEST.json") != EXPECTED_AUDIT_EVIDENCE_MANIFEST_SHA:
        evidence_errors.append("manifest_hash")
    ids = [item.get("id") for item in reports if isinstance(item, dict)]
    paths = [item.get("path") for item in reports if isinstance(item, dict)]
    if ids != list(range(10)) or len(set(paths)) != 10:
        evidence_errors.append("ids_or_paths")
    for item in reports:
        if not isinstance(item, dict):
            evidence_errors.append("shape")
            continue
        path_value = str(item.get("path", ""))
        if not path_value.startswith("agk-upgrade/01-hermes-audit/evidence/"):
            evidence_errors.append(f"path:{item.get('id')}")
            continue
        path = safe_relative(path_value, REPO)
        if path is None or not path.is_file() or path.stat().st_size < 1000 or path.stat().st_size != item.get("bytes") or sha256(path) != item.get("sha256"):
            evidence_errors.append(f"hash:{item.get('id')}")
    add(checks, "A10_INDEPENDENT_AUDIT_EVIDENCE", not evidence_errors, f"reports={len(reports)}, errors={evidence_errors}")

    source_reference_errors = markdown_source_reference_errors()
    add(checks, "A10B_SOURCE_REFERENCES", not source_reference_errors, f"errors={source_reference_errors[:30]}")

    derived_markdown = [
        path for path in ROOT.rglob("*.md")
        if path.relative_to(ROOT).as_posix() != "00-input/OPERATOR_PROMPT.md"
        and not path.relative_to(ROOT).as_posix().startswith("01-hermes-audit/evidence/")
        and not path.relative_to(ROOT).as_posix().startswith("validation/")
    ]
    vocabulary_paths = [
        path for path in ROOT.rglob("*")
        if path.is_file() and path.suffix in {".md", ".yaml", ".yml", ".json"}
        and path.relative_to(ROOT).as_posix() not in {"00-input/OPERATOR_PROMPT.md", "00-input/CANONICAL_CONTRACTS.yaml"}
        and not path.relative_to(ROOT).as_posix().startswith("01-hermes-audit/evidence/")
        and not path.relative_to(ROOT).as_posix().startswith("validation/")
    ]
    quality_targets = [ROOT / rel for rel in REQUIRED if rel.endswith(".md") and rel != "00-input/OPERATOR_PROMPT.md" and not rel.startswith("validation/")]
    quality_targets.extend(dynamic_task_files)
    quality_errors = markdown_quality_errors(sorted(set(quality_targets)))
    placeholders: list[str] = []
    dash_errors: list[str] = []
    retired_errors: list[str] = []
    forbidden_errors: list[str] = []
    retired_words = [bytes.fromhex(value).decode().casefold() for value in ("4541524e", "45564f4c5645", "436972636c65")]
    forbidden = [bytes.fromhex(value).decode() for value in FORBIDDEN_DERIVED_HEX]
    for path in derived_markdown:
        text = path.read_text(encoding="utf-8", errors="replace")
        rel = path.relative_to(ROOT).as_posix()
        if re.search(r"\b(?:TODO|TBD|FIXME|PLACEHOLDER)\b", text):
            placeholders.append(rel)
        if "\u2014" in text or "\u2013" in text:
            dash_errors.append(rel)
    for path in vocabulary_paths:
        text = path.read_text(encoding="utf-8", errors="replace")
        rel = path.relative_to(ROOT).as_posix()
        folded = text.casefold()
        if any(re.search(rf"\b{re.escape(word)}\b", folded) for word in retired_words):
            retired_errors.append(rel)
        for term in forbidden:
            if str(term) in text:
                forbidden_errors.append(f"{rel}:{term}")
    add(checks, "A11_DOCUMENT_QUALITY", not quality_errors and not placeholders and not dash_errors, f"quality={quality_errors[:20]}, placeholders={placeholders[:20]}, dashes={dash_errors[:20]}")
    add(checks, "A12_CANONICAL_VOCABULARY", not retired_errors and not forbidden_errors, f"retired={retired_errors}, forbidden={forbidden_errors[:20]}")

    os_text = (ROOT / "02-agk-spec/AGK_OS_MODEL.md").read_text(encoding="utf-8")
    os_parts = re.findall(r"(?m)^\d+\. (.+)$", os_text.split("## Installation", 1)[0])
    project_text = (ROOT / "02-agk-spec/AGK_PROJECT_MODEL.md").read_text(encoding="utf-8")
    vision_text = (ROOT / "02-agk-spec/AGK_VISION.md").read_text(encoding="utf-8")
    automation_text = (ROOT / "02-agk-spec/AGK_AUTOMATION_MODEL.md").read_text(encoding="utf-8")
    runtime_text = (ROOT / "02-agk-spec/AGK_RUNTIME_CONTRACT.md").read_text(encoding="utf-8")
    agent_text = (ROOT / "02-agk-spec/AGK_AGENT_MODEL.md").read_text(encoding="utf-8")
    deals_text = (ROOT / "07-post-stepper-alignment/DEALS_ALIGNMENT.md").read_text(encoding="utf-8")
    architecture_text = (ROOT / "02-agk-spec/AGK_ARCHITECTURE.md").read_text(encoding="utf-8")
    alignment_text = (ROOT / "AGK_POST_STEPPER_ALIGNMENT_REPORT.md").read_text(encoding="utf-8")
    semantic_errors: list[str] = []
    if os_parts != EXPECTED_OS_PARTS:
        semantic_errors.append(f"os_parts:{os_parts}")
    if not all(stage in project_text for stage in EXPECTED_PROJECT_STAGES) or "IMPROVE` returns to `DISCOVERY` or `ROADMAP`" not in project_text:
        semantic_errors.append("project_stages")
    if "LEARN / DISCOVER -> BUILD -> PROVE -> APPLY -> CAPTURE LEARNING -> IMPROVE" not in vision_text:
        semantic_errors.append("strategic_loop")
    if "Opportunity -> Deal -> Engagement -> Contract -> Project" not in deals_text:
        semantic_errors.append("deals_chain")
    if "Automation is itself the deployment binding" not in automation_text:
        semantic_errors.append("automation_binding")
    if "queued, running, succeeded, failed, cancelled or timed_out" not in runtime_text:
        semantic_errors.append("run_states")
    if "`Worker` is a role" not in agent_text or "ephemeral child Agent" not in (ROOT / "01-hermes-audit/SUBAGENTS_MAP.md").read_text(encoding="utf-8"):
        semantic_errors.append("agent_worker")
    if not all(term in architecture_text for term in ("AGK Web", "Tauri", "Expo")) or "Hermes Electron" not in (ROOT / "DECISIONS.md").read_text(encoding="utf-8"):
        semantic_errors.append("client_stack")
    if "canonical Stepper is unchanged" not in alignment_text or "implementation remains closed" not in alignment_text:
        semantic_errors.append("stepper_status")
    add(checks, "A13_CANONICAL_SEMANTICS", not semantic_errors, f"errors={semantic_errors}")

    tasks = task_index.get("tasks", []) if isinstance(task_index, dict) else []
    task_errors: list[str] = []
    ids = [str(task.get("id", "")) for task in tasks if isinstance(task, dict)]
    expected_ids = [f"{number:03d}" for number in range(1, len(tasks) + 1)]
    if task_index.get("implementation_allowed") is not False or ids != expected_ids or len(set(ids)) != len(ids):
        task_errors.append("index")
    indexed_files: list[Path] = []
    for task in tasks:
        if not isinstance(task, dict):
            task_errors.append("shape")
            continue
        tid = str(task.get("id", ""))
        file_value = str(task.get("file", ""))
        if task.get("status") not in ALLOWED_TASK_STATUSES or task.get("priority") not in ALLOWED_PRIORITIES:
            task_errors.append(f"{tid}:status_or_priority")
        path = safe_relative(file_value, ROOT / "06-implementation")
        if path is None or path.parent != (ROOT / "06-implementation").resolve() or not path.is_file():
            task_errors.append(f"{tid}:path")
            continue
        indexed_files.append(path)
        text = path.read_text(encoding="utf-8")
        positions = [text.find(heading) for heading in TASK_HEADINGS]
        if any(position < 0 for position in positions) or positions != sorted(positions):
            task_errors.append(f"{tid}:headings")
        for index, position in enumerate(positions):
            end = positions[index + 1] if index + 1 < len(positions) else len(text)
            if position >= 0 and len(text[position + len(TASK_HEADINGS[index]):end].strip()) < 2:
                task_errors.append(f"{tid}:empty_section:{TASK_HEADINGS[index]}")
        expected_status = f"Implementation status:** {task.get('status')}"
        if expected_status not in text or "Product implementation is authorized" in text:
            task_errors.append(f"{tid}:doc_status")
        dep_match = re.search(r"(?ms)^## Dependencies\n(.*)\Z", text)
        doc_deps = re.findall(r"`(\d{3})`", dep_match.group(1) if dep_match else "")
        if doc_deps != [str(dep) for dep in task.get("dependencies", [])]:
            task_errors.append(f"{tid}:dependency_mismatch")
    if set(indexed_files) != set(dynamic_task_files):
        task_errors.append("file_set")
    duplicates, unknown, cycles = dependency_cycles(tasks)
    if duplicates or unknown or cycles:
        task_errors.append(f"dag:{duplicates}:{unknown}:{cycles}")
    by_id = {str(task.get("id")): task for task in tasks if isinstance(task, dict)}
    final_adapter_requirements = {"008", "010", "011", "012", "013", "027", "031", "032", "033", "034", "035", "036"}
    if not final_adapter_requirements.issubset(set(by_id.get("009", {}).get("dependencies", []))):
        task_errors.append("adapter_order")
    if not {"021", "031"}.issubset(set(by_id.get("008", {}).get("dependencies", []))):
        task_errors.append("protocol_before_domain")
    if by_id.get("021", {}).get("priority") != "P0" or by_id.get("027", {}).get("priority") != "P0":
        task_errors.append("package_or_bundle_late")
    add(checks, "A14_IMPLEMENTATION_TASKS_AND_DAG", len(tasks) >= 36 and not task_errors, f"count={len(tasks)}, errors={task_errors[:30]}")

    phases = roadmap.get("phases", []) if isinstance(roadmap, dict) else []
    phase_errors: list[str] = []
    if roadmap.get("production_implementation_allowed") is not False or len(phases) < 10:
        phase_errors.append("shape")
    if any(not isinstance(phase.get("outputs"), list) or not phase.get("outputs") for phase in phases if isinstance(phase, dict)):
        phase_errors.append("outputs")
    phase_records = [{"id": phase.get("id"), "dependencies": phase.get("depends_on", [])} for phase in phases if isinstance(phase, dict)]
    phase_duplicates, phase_unknown, phase_cycles = dependency_cycles(phase_records)
    if phase_duplicates or phase_unknown or phase_cycles:
        phase_errors.append(f"dag:{phase_duplicates}:{phase_unknown}:{phase_cycles}")
    names = [phase.get("name") for phase in phases if isinstance(phase, dict)]
    required_phase_names = {"control_plane_spine", "runtime_contract_and_security_boundary", "executable_hermes_adapter", "web_tauri_shell_canvas"}
    if not required_phase_names.issubset(set(names)):
        phase_errors.append("ordering_names")
    add(checks, "A15_ROADMAP_DAG", not phase_errors, f"phases={len(phases)}, errors={phase_errors}")

    decisions_text = (ROOT / "DECISIONS.md").read_text(encoding="utf-8")
    decision_matches = list(re.finditer(r"(?m)^## D-(\d{3})\.[^\n]*\n", decisions_text))
    decision_errors: list[str] = []
    decision_ids = [match.group(1) for match in decision_matches]
    if decision_ids != [f"{number:03d}" for number in range(1, len(decision_ids) + 1)] or len(set(decision_ids)) != len(decision_ids):
        decision_errors.append("ids")
    labels = ["**Status:**", "**Decision:**", "**Context:**", "**Options:**", "**Chosen:**", "**Why:**", "**Hermes impact:**", "**AGK impact:**", "**Future consequences:**", "**Reversibility:**"]
    for index, match in enumerate(decision_matches):
        end = decision_matches[index + 1].start() if index + 1 < len(decision_matches) else len(decisions_text)
        block = decisions_text[match.end():end]
        if any(label not in block for label in labels):
            decision_errors.append(f"{match.group(1)}:labels")
        status_match = re.search(r"\*\*Status:\*\*\s*([^\n]+)", block)
        if not status_match or not status_match.group(1).startswith(("RATIFIED", "PROPOSED", "DEFERRED")):
            decision_errors.append(f"{match.group(1)}:status")
        if "Product implementation is authorized" in block or "**Status:** IMPLEMENTED" in block:
            decision_errors.append(f"{match.group(1)}:authority")
    if "## D-005" not in decisions_text or "DEFERRED pending single-authority proof" not in decisions_text:
        decision_errors.append("scheduler_decision")
    add(checks, "A16_DECISION_LOG", len(decision_matches) >= 10 and not decision_errors, f"entries={len(decision_matches)}, errors={decision_errors}")

    blueprint_text = (ROOT / "AGK_HERMES_MASTER_BLUEPRINT.md").read_text(encoding="utf-8")
    alignment_text = (ROOT / "AGK_POST_STEPPER_ALIGNMENT_REPORT.md").read_text(encoding="utf-8")
    depth_errors: list[str] = []
    for number in range(1, 31):
        if not re.search(rf"(?m)^## {number}\.", blueprint_text):
            depth_errors.append(f"blueprint:{number}")
    for number in range(1, 35):
        if not re.search(rf"(?m)^## {number}\.", alignment_text):
            depth_errors.append(f"alignment:{number}")
    if "## Final verdict" not in alignment_text:
        depth_errors.append("final_verdict")
    prompt_rows = prompt_matrix.get("rows", []) if isinstance(prompt_matrix, dict) else []
    expected_prompt_sections = list(range(1, 207))
    observed_prompt_sections = [row.get("section") for row in prompt_rows if isinstance(row, dict)]
    allowed_planning_statuses = {"COVERED", "PARTIAL"}
    allowed_implementation_statuses = {"NOT_APPLICABLE", "NOT_STARTED", "DEFERRED", "BLOCKED_BY_GATE"}
    if (
        prompt_matrix.get("numbered_instruction_groups") != 206
        or observed_prompt_sections != expected_prompt_sections
        or any(row.get("planning_status") not in allowed_planning_statuses for row in prompt_rows if isinstance(row, dict))
        or any(row.get("implementation_status") not in allowed_implementation_statuses for row in prompt_rows if isinstance(row, dict))
    ):
        depth_errors.append("prompt_completion_matrix")
    add(checks, "A17_MASTER_DELIVERABLE_SECTIONS", not depth_errors, f"errors={depth_errors}")

    evidence_shape_ok = (
        isinstance(test_evidence, dict)
        and test_evidence.get("schema_version") == "2.0.0"
        and test_evidence.get("architecture_validator", {}).get("status") == "PASS"
        and test_evidence.get("architecture_validator", {}).get("passed") == 22
        and test_evidence.get("architecture_validator", {}).get("failed") == 0
        and test_evidence.get("validator_mutation_tests", {}).get("status") == "PASS"
        and test_evidence.get("validator_mutation_tests", {}).get("tests", 0) >= 31
        and test_evidence.get("python_lint", {}).get("status") == "PASS"
        and test_evidence.get("git_diff_check", {}).get("status") == "PASS"
        and test_evidence.get("product_implementation_allowed") is False
    )
    add(checks, "A18_TEST_EVIDENCE_SHAPE", evidence_shape_ok, f"keys={sorted(test_evidence) if isinstance(test_evidence, dict) else []}")

    final_reviews = final_review.get("reviews", []) if isinstance(final_review, dict) else []
    final_review_ok = (
        isinstance(final_review, dict)
        and final_review.get("verdict") == "PASS"
        and final_review.get("product_implementation_allowed") is False
        and {item.get("area") for item in final_reviews if isinstance(item, dict)} == {"canon", "runtime", "validator", "audit"}
        and all(item.get("verdict") == "PASS" and re.fullmatch(r"[0-9a-f]{64}", str(item.get("transcript_sha256", ""))) and item.get("transcript_bytes", 0) > 1000 for item in final_reviews if isinstance(item, dict))
    )
    add(checks, "A18B_FINAL_INDEPENDENT_REVIEW", final_review_ok, f"areas={[item.get('area') for item in final_reviews if isinstance(item, dict)]}")

    allowed_machine = {".md", ".yaml", ".yml", ".json"}
    product_code_errors: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT).as_posix()
        if "__pycache__" in path.parts or path.suffix == ".pyc":
            product_code_errors.append(rel)
        elif path.suffix == ".py":
            if rel not in {"tools/validate_architecture.py", "tools/test_validate_architecture.py"}:
                product_code_errors.append(rel)
        elif path.suffix not in allowed_machine:
            product_code_errors.append(rel)
    changed = parse_status_paths()
    outside = sorted(path for path in changed if path and not path.startswith("agk-upgrade/"))
    head = git("rev-parse", "HEAD")
    commit_outside: list[str] = []
    try:
        ancestor = subprocess.run(["git", "merge-base", "--is-ancestor", EXPECTED_HERMES_COMMIT, head], cwd=REPO).returncode == 0
        if not ancestor:
            commit_outside.append("baseline_not_ancestor")
        else:
            commit_outside.extend(path for path in git("diff", "--name-only", f"{EXPECTED_HERMES_COMMIT}..{head}").splitlines() if path and not path.startswith("agk-upgrade/"))
    except subprocess.CalledProcessError:
        commit_outside.append("history_unavailable")
    assume_unchanged: list[str] = []
    for line in git("ls-files", "-v").splitlines():
        if line and line[0].islower() and not line[2:].startswith("agk-upgrade/"):
            assume_unchanged.append(line[2:])
    no_product_ok = not product_code_errors and not outside and not commit_outside and not assume_unchanged
    add(checks, "A19_NO_PRODUCT_IMPLEMENTATION", no_product_ok, f"ssot_code={product_code_errors}, outside={outside}, committed={commit_outside}, hidden={assume_unchanged[:20]}")

    modified_register = (ROOT / "04-upstream-strategy/HERMES_FILES_MODIFIED.md").read_text(encoding="utf-8")
    register_ok = "No Hermes production file has been modified" in modified_register and not outside and not commit_outside
    add(checks, "A20_UPSTREAM_MODIFICATION_REGISTER", register_ok, f"outside={outside}, committed={commit_outside}")

    return checks


def main() -> int:
    prior_exists = {rel: (ROOT / rel).is_file() for rel in REQUIRED}
    for stale in (OUT / "VALIDATION_RESULTS.json", OUT / "VALIDATION_RESULTS.md"):
        stale.unlink(missing_ok=True)
    write_report([{"id": "A00_VALIDATION_INCOMPLETE", "status": "FAIL", "evidence": "validation started but did not complete"}], forced_status="FAIL")
    try:
        checks = run_checks(prior_exists)
    except Exception as exc:
        checks = [{"id": "A00_VALIDATOR_EXCEPTION", "status": "FAIL", "evidence": f"{type(exc).__name__}: {exc}"}]
    report = write_report(checks)
    print(json.dumps({"status": report["status"], "passed": report["passed"], "failed": report["failed"]}, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
