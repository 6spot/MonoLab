"""Negative controls for evidence correlation and physically observed identity."""
import copy
import json
import unittest
from unittest.mock import Mock

import probe
import test_probe
from test_probe import completed_state


class EvidenceContractTests(unittest.TestCase):
    setUp = test_probe.AcceptanceTests.setUp
    tearDown = test_probe.AcceptanceTests.tearDown

    def test_operation_must_match_its_receipt(self):
        for kind, index, field, value, check in (
            ("node", 1, "operation_id", "unrelated", "finalized_exact_git_result"),
            ("planner", 1, "operation_id", "unrelated", "planner_stop_succeeded"),
            ("planner", 0, "kind", "stop", "correct_workspace_receipt"),
        ):
            with self.subTest(kind=kind, check=check):
                state = completed_state(kind)
                state["operations"][index][field] = value
                self.assertFalse(self.instance.verify("one", state)["checks"][check])

    def test_required_checks_reject_truthy_non_boolean_values(self):
        for kind in ("node", "planner"):
            for key in probe.COMMON_CHECKS | probe.KIND_CHECKS[kind]:
                for value in (1, "true", False):
                    with self.subTest(kind=kind, key=key, value=value):
                        state = completed_state(kind)
                        state["driver"]["checks"][key] = value
                        self.assertFalse(self.instance.verify("one", state)["checks"][key])

    def test_missing_stage_and_handoff_id_fail(self):
        for key in ("stage", "handoff_request_id"):
            state = completed_state("planner")
            del state["driver"][key]
            self.assertFalse(self.instance.verify("one", state)["checks"]["complete_driver_evidence"])

    def test_successful_stop_still_requires_writer_absence(self):
        state = completed_state("planner")
        state["operations"][1]["writer_absent"] = False
        self.assertFalse(self.instance.verify("one", state)["checks"]["planner_stop_succeeded"])

    def test_delayed_revoke_refuses_unresolved_claim_before_stopping(self):
        self.instance.runner = "runner-a"
        self.instance.query = Mock(return_value=["unresolved"])
        self.instance.call = Mock()
        self.instance.admin = Mock()
        with self.assertRaisesRegex(RuntimeError, "existing probe ownership"):
            self.instance.delayed_revoke("never-started")
        self.instance.call.assert_not_called()
        self.instance.admin.assert_not_called()


class IdentityTests(unittest.TestCase):
    def live(self):
        state = completed_state()
        state["live_identity"] = {**state["ownership"], "present": True, "uid": 1000}
        return state

    def test_real_identity_survives_service_restart(self):
        before = self.live()
        self.assertTrue(probe.retained_live_identity(before, copy.deepcopy(before)))

    def test_cached_or_empty_identity_cannot_pass(self):
        for observed in ({}, {"present": False}, {"present": True}):
            state = {"ownership": {}, "live_identity": observed}
            self.assertFalse(probe.retained_live_identity(state, copy.deepcopy(state)))
        before = self.live()
        after = copy.deepcopy(before)
        after["live_identity"] = {"present": False}
        self.assertFalse(probe.retained_live_identity(before, after))

    def test_each_identity_component_is_required_and_unchanged(self):
        for key in ("pid", "birth", "boot_id", "cgroup"):
            with self.subTest(key=key):
                before = self.live()
                after = copy.deepcopy(before)
                del before["live_identity"][key]
                del before["ownership"][key]
                self.assertFalse(probe.retained_live_identity(before, after))
                before = self.live()
                after = copy.deepcopy(before)
                after["live_identity"][key] = 124 if key == "pid" else "changed"
                after["ownership"][key] = after["live_identity"][key]
                self.assertFalse(probe.retained_live_identity(before, after))


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.instance = probe.Probe.__new__(probe.Probe)
        self.model = {"id": "mimo-v2.6-flash-free", "status": "active", "cost": {"input": 0, "output": 0, "cache": {"read": 0, "write": 0}}, "capabilities": {"toolcall": True}}

    def catalog(self, model):
        self.instance.call = Mock(return_value="\x1b[32m" + probe.MODEL + "\x1b[0m\n" + json.dumps(model))
        return self.instance.catalog()

    def test_free_model_check_uses_execution_readable_cwd(self):
        self.assertEqual(self.catalog(self.model)["model"], probe.MODEL)
        self.assertEqual(self.instance.call.call_args.kwargs["cwd"], "/home/me")

    def test_paid_unknown_or_non_tool_model_is_refused(self):
        for mutation in (lambda m: m["cost"].update(input=1), lambda m: m["cost"]["cache"].pop("read"), lambda m: m["cost"].update(input=False), lambda m: m.update(status="inactive"), lambda m: m["capabilities"].update(toolcall=False), lambda m: m.update(id="paid-model")):
            model = copy.deepcopy(self.model)
            mutation(model)
            with self.assertRaises(RuntimeError):
                self.catalog(model)


if __name__ == "__main__":
    unittest.main()
