#!/usr/bin/env python3
"""Run post-edit verification against a human-approved baseline.

This script is non-destructive. It compares test results and changed-file scope.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import fnmatch
import json
from pathlib import Path
import subprocess
import time
import xml.etree.ElementTree as ET
from typing import Any


def find_repo_root(start: Path) -> Path:
    result = subprocess.run(
        ["git", "-C", str(start), "rev-parse", "--show-toplevel"],
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError("Not inside a Git repository.")
    return Path(result.stdout.strip()).resolve()


def run_git(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], cwd=root, text=True, capture_output=True, check=False)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def parse_junit(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        root = ET.parse(path).getroot()
    except (ET.ParseError, OSError):
        return []
    cases: list[dict[str, Any]] = []
    for case in root.iter("testcase"):
        classname = case.attrib.get("classname", "")
        name = case.attrib.get("name", "")
        test_id = f"{classname}::{name}" if classname else name
        status = "passed"
        message = ""
        if case.find("failure") is not None:
            status = "failed"
            node = case.find("failure")
            message = (node.attrib.get("message", "") + "\n" + (node.text or "")).strip()
        elif case.find("error") is not None:
            status = "error"
            node = case.find("error")
            message = (node.attrib.get("message", "") + "\n" + (node.text or "")).strip()
        elif case.find("skipped") is not None:
            status = "skipped"
            node = case.find("skipped")
            message = (node.attrib.get("message", "") + "\n" + (node.text or "")).strip()
        cases.append({"id": test_id, "status": status, "message": message})
    return cases


def matches_any(path: str, patterns: list[str]) -> bool:
    normalized = path.replace("\\", "/")
    for pattern in patterns:
        p = pattern.replace("\\", "/")
        if fnmatch.fnmatch(normalized, p):
            return True
        if p.endswith("/**") and normalized.startswith(p[:-3].rstrip("/") + "/"):
            return True
        if normalized == p.rstrip("/"):
            return True
        if p.endswith("/") and normalized.startswith(p):
            return True
    return False


def changed_paths(root: Path, baseline_commit: str) -> list[str]:
    diff = run_git(root, "diff", "--name-only", baseline_commit, "--")
    tracked = [line.strip().replace("\\", "/") for line in diff.stdout.splitlines() if line.strip()]
    untracked_result = run_git(root, "ls-files", "--others", "--exclude-standard")
    untracked = [line.strip().replace("\\", "/") for line in untracked_result.stdout.splitlines() if line.strip()]
    return sorted(set(tracked + untracked))


def compare_cases(approved: list[dict[str, Any]], current: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    approved_map = {case["id"]: case for case in approved}
    current_map = {case["id"]: case for case in current}
    unchanged: list[dict[str, Any]] = []
    introduced: list[dict[str, Any]] = []
    resolved: list[dict[str, Any]] = []
    changed: list[dict[str, Any]] = []
    ambiguous: list[dict[str, Any]] = []

    for test_id, current_case in current_map.items():
        prior = approved_map.get(test_id)
        if prior is None:
            if current_case["status"] in {"failed", "error"}:
                introduced.append(current_case)
            continue
        if prior.get("status") == current_case.get("status"):
            if current_case["status"] in {"failed", "error"}:
                unchanged.append({
                    **current_case,
                    "baseline_classification": prior.get("classification", "unclassified"),
                })
        elif prior.get("status") in {"failed", "error"} and current_case.get("status") == "passed":
            resolved.append({"id": test_id, "before": prior.get("status"), "after": "passed"})
        else:
            changed.append({
                "id": test_id,
                "before": prior.get("status"),
                "after": current_case.get("status"),
            })

    for test_id, prior in approved_map.items():
        if test_id not in current_map:
            ambiguous.append({
                "id": test_id,
                "reason": "Test existed in approved baseline but was not present in current parsed results.",
                "baseline_status": prior.get("status"),
            })

    return {
        "unchanged_failures": unchanged,
        "new_failures": introduced,
        "resolved_failures": resolved,
        "changed_results": changed,
        "ambiguous_results": ambiguous,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify changes against a human-approved baseline.")
    parser.add_argument("--root", default=".")
    parser.add_argument("--phase-file", default=".agents/state/current_phase.json")
    parser.add_argument("--commands-file")
    parser.add_argument("--approved-baseline")
    parser.add_argument("--output-dir")
    args = parser.parse_args()

    root = find_repo_root(Path(args.root).resolve())
    phase = load_json(root / args.phase_file)
    if phase.get("status") != "approved" or phase.get("approved_by_human") is not True:
        print("FAIL: Current phase is not human-approved.")
        return 2

    baseline_file = args.approved_baseline or phase.get("approved_baseline_file")
    if not baseline_file:
        print("FAIL: No approved baseline file configured.")
        return 3
    baseline_path = root / baseline_file
    if not baseline_path.exists():
        print(f"FAIL: Approved baseline file does not exist: {baseline_path}")
        return 4
    baseline = load_json(baseline_path)
    if baseline.get("status") != "approved" or baseline.get("approved_by_human") is not True:
        print("FAIL: Baseline artifact is not explicitly human-approved.")
        return 5
    if baseline.get("phase_id") != phase.get("phase_id"):
        print("FAIL: Approved baseline phase does not match current phase.")
        return 6
    if baseline.get("commit") != phase.get("baseline_commit"):
        print("FAIL: Approved baseline commit does not match phase baseline_commit.")
        return 7

    allowed = list(phase.get("allowed_paths", []))
    exempt = list(phase.get("scope_exempt_paths", []))
    excluded = list(phase.get("excluded_paths", []))
    paths = changed_paths(root, phase["baseline_commit"])
    out_of_scope = [
        p for p in paths
        if (not matches_any(p, allowed) and not matches_any(p, exempt)) or matches_any(p, excluded)
    ]

    commands_file = args.commands_file or phase.get("verification_commands_file")
    if not commands_file:
        print("FAIL: No verification command file configured.")
        return 8
    config = load_json(root / commands_file)
    commands = [c for c in config.get("commands", []) if c.get("enabled", True)]
    if not commands:
        print("FAIL: Verification command file contains no enabled commands.")
        return 9

    phase_id = phase.get("phase_id", "unknown-phase")
    output_dir = Path(args.output_dir) if args.output_dir else root / ".agents/state/verifications" / phase_id
    if not output_dir.is_absolute():
        output_dir = root / output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    command_results: list[dict[str, Any]] = []
    current_cases: list[dict[str, Any]] = []
    for item in commands:
        name = item.get("name", "unnamed")
        argv = item.get("command")
        if not isinstance(argv, list) or not argv or not all(isinstance(x, str) for x in argv):
            print(f"FAIL: Command '{name}' must be a non-empty string array.")
            return 10
        cwd = root / item.get("cwd", ".")
        print(f"RUN: {name}: {argv}")
        started = time.monotonic()
        result = subprocess.run(argv, cwd=cwd, text=True, capture_output=True, check=False)
        duration = time.monotonic() - started
        stdout_path = output_dir / f"{name}.stdout.txt"
        stderr_path = output_dir / f"{name}.stderr.txt"
        stdout_path.write_text(result.stdout, encoding="utf-8", errors="replace")
        stderr_path.write_text(result.stderr, encoding="utf-8", errors="replace")

        parsed: list[dict[str, Any]] = []
        if item.get("junit_xml"):
            parsed = parse_junit(root / item["junit_xml"])
            current_cases.extend(parsed)
        command_results.append({
            "name": name,
            "command": argv,
            "cwd": str(cwd.relative_to(root)),
            "exit_code": result.returncode,
            "duration_seconds": round(duration, 3),
            "stdout_file": str(stdout_path.relative_to(root)),
            "stderr_file": str(stderr_path.relative_to(root)),
            "test_case_count": len(parsed),
        })
        print(f"RESULT: {name}: exit={result.returncode}")

    comparison = compare_cases(list(baseline.get("test_cases", [])), current_cases)
    command_failures = [item for item in command_results if item["exit_code"] != 0]

    blocking = bool(
        out_of_scope
        or comparison["new_failures"]
        or comparison["changed_results"]
        or comparison["ambiguous_results"]
        or command_failures
    )

    report = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "phase_id": phase_id,
        "baseline_commit": phase["baseline_commit"],
        "approved_baseline_file": str(baseline_path.relative_to(root)),
        "changed_paths": paths,
        "out_of_scope_paths": out_of_scope,
        "commands": command_results,
        "comparison": comparison,
        "blocking_review_required": blocking,
    }

    json_path = output_dir / "post_edit_verification.json"
    md_path = output_dir / "post_edit_verification.md"
    json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    md_lines = [
        "# Post-Edit Verification",
        "",
        f"- Phase: `{phase_id}`",
        f"- Baseline commit: `{phase['baseline_commit']}`",
        f"- Out-of-scope files: `{len(out_of_scope)}`",
        f"- New failures: `{len(comparison['new_failures'])}`",
        f"- Changed results: `{len(comparison['changed_results'])}`",
        f"- Ambiguous results: `{len(comparison['ambiguous_results'])}`",
        f"- Blocking review required: `{blocking}`",
        "",
        "## Out-of-Scope Files",
        *[f"- `{p}`" for p in out_of_scope],
    ]
    md_path.write_text("\n".join(md_lines), encoding="utf-8")

    if out_of_scope:
        print("FAIL: Out-of-scope files detected:")
        for path in out_of_scope:
            print(f"  - {path}")
    if comparison["new_failures"]:
        print(f"FAIL: {len(comparison['new_failures'])} new test failures detected.")
    if comparison["changed_results"]:
        print(f"FAIL: {len(comparison['changed_results'])} changed test results require review.")
    if comparison["ambiguous_results"]:
        print(f"FAIL: {len(comparison['ambiguous_results'])} ambiguous test results require review.")
    if command_failures:
        print(f"FAIL: {len(command_failures)} verification commands returned non-zero.")
    if blocking:
        print("HITL REQUIRED: Review the verification report before proceeding.")
        return 1

    print("PASS: Verification matches the approved baseline and file scope.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
