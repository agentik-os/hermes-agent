#!/usr/bin/env python3
"""Adversarial mutation tests for validate_architecture.py."""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import yaml

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("agk_validate_architecture", HERE / "validate_architecture.py")
assert SPEC and SPEC.loader
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)
SOURCE_ROOT = getattr(validator, "ROOT")


class ArchitectureValidatorMutationTests(unittest.TestCase):
    maxDiff = None

    def run_copy(self, mutate=None):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw) / "agk-upgrade"
            shutil.copytree(SOURCE_ROOT, root)
            if mutate:
                mutate(root)
            old_root, old_out = getattr(validator, "ROOT"), getattr(validator, "OUT")
            setattr(validator, "ROOT", root)
            setattr(validator, "OUT", root / "validation")
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    code = validator.main()
                report = json.loads((getattr(validator, "OUT") / "VALIDATION_RESULTS.json").read_text(encoding="utf-8"))
            finally:
                setattr(validator, "ROOT", old_root)
                setattr(validator, "OUT", old_out)
            return code, report

    def assert_failed(self, report, check_id):
        checks = {item["id"]: item for item in report["checks"]}
        self.assertEqual(report["status"], "FAIL")
        self.assertEqual(checks[check_id]["status"], "FAIL")

    def test_current_architecture_passes(self):
        code, report = self.run_copy()
        self.assertEqual(code, 0)
        self.assertEqual(report["status"], "PASS")

    def test_missing_required_artifact_fails_and_replaces_stale_pass(self):
        def mutate(root):
            (root / "02-agk-spec/AGK_OS_MODEL.md").unlink()
        code, report = self.run_copy(mutate)
        self.assertEqual(code, 1)
        self.assert_failed(report, "A01_REQUIRED_ARTIFACTS")

    def test_missing_validator_test_suite_is_required(self):
        def mutate(root):
            (root / "tools/test_validate_architecture.py").unlink()
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A01_REQUIRED_ARTIFACTS")

    def test_missing_prior_validation_output_fails_this_run(self):
        def mutate(root):
            (root / "validation/VALIDATION_RESULTS.json").unlink()
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A01_REQUIRED_ARTIFACTS")
        self.assertTrue((SOURCE_ROOT / "validation/VALIDATION_RESULTS.json").exists())

    def test_invalid_consumed_json_never_leaves_pass(self):
        def mutate(root):
            (root / "00-input/SOURCE_MANIFEST.json").write_text("{", encoding="utf-8")
        code, report = self.run_copy(mutate)
        self.assertEqual(code, 1)
        self.assertEqual(report["status"], "FAIL")

    def test_duplicate_yaml_key_fails(self):
        def mutate(root):
            path = root / "05-roadmap/roadmap.yaml"
            path.write_text(path.read_text(encoding="utf-8") + "schema_version: 9\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A02_MACHINE_FORMATS_AND_UNIQUE_KEYS")

    def test_valid_but_wrong_manifest_type_fails(self):
        def mutate(root):
            (root / "ARCHITECTURE_MANIFEST.yaml").write_text("[]\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A03_ARCHITECTURE_MANIFEST")

    def test_empty_required_markdown_fails(self):
        def mutate(root):
            (root / "03-gap-analysis/REUSE_PLAN.md").write_text("", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A11_DOCUMENT_QUALITY")

    def test_padding_cannot_replace_master_blueprint(self):
        def mutate(root):
            (root / "AGK_HERMES_MASTER_BLUEPRINT.md").write_text("# Padding\n" + "a" * 20000, encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A17_MASTER_DELIVERABLE_SECTIONS")

    def test_prompt_completion_matrix_accounts_for_all_sections(self):
        def mutate(root):
            path = root / "PROMPT_COMPLETION_MATRIX.json"
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["rows"].pop()
            path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A17_MASTER_DELIVERABLE_SECTIONS")

    def test_dummy_mapping_registry_fails(self):
        def mutate(root):
            payload = {"schema_version": "1.0.0", "agk": {f"dummy{i}": {"strategy": "REUSE", "hermes": {"coverage": "native", "components": []}} for i in range(32)}}
            (root / "agk-hermes-map.yaml").write_text(yaml.safe_dump(payload), encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A07_AGK_HERMES_MAPPING")

    def test_missing_capability_class_fails(self):
        def mutate(root):
            path = root / "01-hermes-audit/hermes-capabilities.yaml"
            path.write_text(path.read_text(encoding="utf-8").replace("ProviderProfile]", "MissingProviderProfile]", 1), encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A08_HERMES_CAPABILITY_REGISTRY")

    def test_markdown_source_reference_fails(self):
        def mutate(root):
            path = root / "01-hermes-audit/CAPABILITY_MAP.md"
            path.write_text(path.read_text(encoding="utf-8").replace("run_agent.py::AIAgent", "missing/runtime.py::AIAgent", 1), encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A10B_SOURCE_REFERENCES")

    def test_capability_crosswalk_mismatch_fails(self):
        def mutate(root):
            path = root / "01-hermes-audit/hermes-capabilities.yaml"
            path.write_text(path.read_text(encoding="utf-8").replace("agk_strategy: EXTEND", "agk_strategy: REUSE", 1), encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A08_HERMES_CAPABILITY_REGISTRY")

    def test_inventory_literal_drift_fails_against_live_source(self):
        def mutate(root):
            path = root / "01-hermes-audit/REPOSITORY_INVENTORY.json"
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["literal_builtin_tool_count"] += 1
            path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A09_REPOSITORY_INVENTORY")

    def test_duplicate_external_evidence_paths_fail(self):
        def mutate(root):
            path = root / "01-hermes-audit/evidence/MANIFEST.json"
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["reports"] = [dict(payload["reports"][0], id=i) for i in range(10)]
            path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A10_INDEPENDENT_AUDIT_EVIDENCE")

    def test_forbidden_ontology_identifier_fails(self):
        def mutate(root):
            path = root / "03-gap-analysis/REUSE_PLAN.md"
            path.write_text(path.read_text(encoding="utf-8") + "\nRuntimeWorkspaceBinding\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A12_CANONICAL_VOCABULARY")

    def test_os_part_expansion_fails_semantic_check(self):
        def mutate(root):
            path = root / "02-agk-spec/AGK_OS_MODEL.md"
            path.write_text(path.read_text(encoding="utf-8").replace("16. Versions", "16. Versions\n17. Runtime", 1), encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A13_CANONICAL_SEMANTICS")

    def test_task_duplicate_ids_and_implementation_flag_fail(self):
        def mutate(root):
            path = root / "06-implementation/tasks.json"
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["implementation_allowed"] = True
            payload["tasks"][1]["id"] = payload["tasks"][0]["id"]
            payload["tasks"][0]["status"] = "IMPLEMENTED"
            path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A14_IMPLEMENTATION_TASKS_AND_DAG")

    def test_task_absolute_path_escape_fails(self):
        def mutate(root):
            path = root / "06-implementation/tasks.json"
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["tasks"][0]["file"] = str(root / "README.md")
            path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A14_IMPLEMENTATION_TASKS_AND_DAG")

    def test_task_cycle_fails(self):
        def mutate(root):
            path = root / "06-implementation/tasks.json"
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["tasks"][0]["dependencies"] = [payload["tasks"][1]["id"]]
            payload["tasks"][1]["dependencies"] = [payload["tasks"][0]["id"]]
            path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A14_IMPLEMENTATION_TASKS_AND_DAG")

    def test_runtime_adapter_security_ordering_is_enforced(self):
        def mutate(root):
            path = root / "06-implementation/tasks.json"
            payload = json.loads(path.read_text(encoding="utf-8"))
            next(task for task in payload["tasks"] if task["id"] == "009")["dependencies"] = ["008"]
            path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A14_IMPLEMENTATION_TASKS_AND_DAG")

    def test_package_trust_precedes_runtime_protocol(self):
        def mutate(root):
            path = root / "06-implementation/tasks.json"
            payload = json.loads(path.read_text(encoding="utf-8"))
            protocol = next(task for task in payload["tasks"] if task["id"] == "008")
            protocol["dependencies"].remove("021")
            path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A14_IMPLEMENTATION_TASKS_AND_DAG")

    def test_roadmap_cycle_fails(self):
        def mutate(root):
            path = root / "05-roadmap/roadmap.yaml"
            payload = yaml.safe_load(path.read_text(encoding="utf-8"))
            payload["phases"][0]["depends_on"] = [payload["phases"][-1]["id"]]
            path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A15_ROADMAP_DAG")

    def test_duplicate_decision_and_implemented_status_fail(self):
        def mutate(root):
            path = root / "DECISIONS.md"
            text = path.read_text(encoding="utf-8").replace("## D-002.", "## D-001.", 1)
            text = text.replace("**Status:** RATIFIED", "**Status:** IMPLEMENTED", 1)
            path.write_text(text, encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A16_DECISION_LOG")

    def test_fake_source_pin_and_absolute_prompt_fail(self):
        def mutate(root):
            path = root / "00-input/SOURCE_MANIFEST.json"
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["hermes_baseline"]["commit"] = "0" * 40
            payload["operator_prompt"]["path"] = "/tmp/fake-prompt.md"
            path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A05_SOURCE_PROVENANCE")

    def test_final_review_manifest_must_contain_four_passes(self):
        def mutate(root):
            path = root / "validation/FINAL_REVIEW_MANIFEST.json"
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["reviews"][0]["verdict"] = "FAIL"
            path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A18B_FINAL_INDEPENDENT_REVIEW")

    def test_product_code_inside_ssot_fails(self):
        def mutate(root):
            (root / "product.ts").write_text("export const product = true\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A19_NO_PRODUCT_IMPLEMENTATION")

    def test_porcelain_rename_records_both_paths(self):
        raw = b"R  new_product.py\0agk-upgrade/old_product.py\0"
        self.assertEqual(validator.parse_porcelain_z(raw), ["new_product.py", "agk-upgrade/old_product.py"])

    def test_initial_report_write_failure_cannot_leave_stale_machine_pass(self):
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw) / "agk-upgrade"
            shutil.copytree(SOURCE_ROOT, root)
            out = root / "validation"
            (out / "VALIDATION_RESULTS.json").write_text('{"status":"PASS"}\n', encoding="utf-8")
            old_root, old_out = getattr(validator, "ROOT"), getattr(validator, "OUT")
            setattr(validator, "ROOT", root)
            setattr(validator, "OUT", out)
            try:
                with mock.patch.object(validator, "atomic_write", side_effect=OSError("injected")):
                    with self.assertRaises(OSError):
                        validator.main()
                self.assertFalse((out / "VALIDATION_RESULTS.json").exists())
            finally:
                setattr(validator, "ROOT", old_root)
                setattr(validator, "OUT", old_out)

    def test_disallowed_dash_fails(self):
        def mutate(root):
            path = root / "03-gap-analysis/REUSE_PLAN.md"
            path.write_text(path.read_text(encoding="utf-8") + "\ninvalid " + chr(0x2014) + " dash\n", encoding="utf-8")
        _, report = self.run_copy(mutate)
        self.assert_failed(report, "A11_DOCUMENT_QUALITY")


if __name__ == "__main__":
    unittest.main()
