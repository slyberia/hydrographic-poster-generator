#!/usr/bin/env python3
"""Validate repository, branch, phase state, and worktree safety.

This script is non-destructive. It never resets, stashes, cleans, or edits files.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
from pathlib import Path
import subprocess
import sys
from typing import Any


def run_git(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=root,
        text=True,
        capture_output=True,
        check=False,
    )


def find_repo_root(start: Path) -> Path | None:
    result = subprocess.run(
        ["git", "-C", str(start), "rev-parse", "--show-toplevel"],
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        return None
    return Path(result.stdout.strip()).resolve()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def parse_porcelain(text: str) -> list[str]:
    paths: list[str] = []
    for raw in text.splitlines():
        if not raw:
            continue
        payload = raw[3:] if len(raw) >= 4 else raw
        if " -> " in payload:
            payload = payload.split(" -> ", 1)[1]
        paths.append(payload.replace("\\", "/"))
    return paths


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


def write_report(report: dict[str, Any], json_out: str | None) -> None:
    if json_out:
        path = Path(json_out)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(report, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run non-destructive Git and phase preflight checks.")
    parser.add_argument("--root", default=".")
    parser.add_argument("--phase-file", default=".agents/state/current_phase.json")
    parser.add_argument("--phase-id", help="Optional expected phase ID.")
    parser.add_argument("--json-out")
    args = parser.parse_args()

    issues: list[str] = []
    warnings: list[str] = []
    root = find_repo_root(Path(args.root).resolve())
    if root is None:
        report = {"ok": False, "issues": ["Not inside a Git repository."], "warnings": []}
        print("FAIL: Not inside a Git repository.")
        write_report(report, args.json_out)
        return 2

    phase_path = (root / args.phase_file).resolve()
    if not phase_path.exists():
        report = {
            "ok": False,
            "repository_root": str(root),
            "issues": [f"Phase file does not exist: {phase_path}"],
            "warnings": [],
        }
        print(f"FAIL: Phase file does not exist: {phase_path}")
        write_report(report, args.json_out)
        return 3

    try:
        phase = load_json(phase_path)
    except (OSError, json.JSONDecodeError) as exc:
        report = {"ok": False, "issues": [f"Invalid phase file: {exc}"], "warnings": []}
        print(f"FAIL: Invalid phase file: {exc}")
        write_report(report, args.json_out)
        return 4

    if phase.get("status") != "approved":
        issues.append("Phase status is not 'approved'.")
    if phase.get("approved_by_human") is not True:
        issues.append("Phase is not explicitly marked approved_by_human=true.")
    if args.phase_id and phase.get("phase_id") != args.phase_id:
        issues.append(f"Expected phase '{args.phase_id}', found '{phase.get('phase_id')}'.")

    branch_result = run_git(root, "branch", "--show-current")
    branch = branch_result.stdout.strip()
    expected_branch = str(phase.get("branch", "")).strip()
    if not expected_branch:
        issues.append("Phase file does not define a branch.")
    elif branch != expected_branch:
        issues.append(f"Current branch '{branch}' does not match approved branch '{expected_branch}'.")

    protected = set(phase.get("protected_branches", ["main", "master"]))
    if branch in protected:
        issues.append(f"Current branch '{branch}' is protected.")

    baseline_commit = str(phase.get("baseline_commit", "")).strip()
    if not baseline_commit:
        issues.append("Phase file does not define a baseline_commit.")
    else:
        commit_check = run_git(root, "cat-file", "-e", f"{baseline_commit}^{{commit}}")
        if commit_check.returncode != 0:
            issues.append(f"Baseline commit does not exist: {baseline_commit}")

    allowed_paths = list(phase.get("allowed_paths", []))
    if not allowed_paths:
        issues.append("Phase file has no allowed_paths.")

    prohibited_ops = set(phase.get("prohibited_operations", []))
    if "edit" in prohibited_ops:
        issues.append("Phase explicitly prohibits editing.")

    status_result = run_git(root, "status", "--porcelain=v1", "--untracked-files=all")
    dirty_paths = parse_porcelain(status_result.stdout)
    approved_existing = list(phase.get("known_preexisting_changes", []))
    unexpected_dirty = [p for p in dirty_paths if not matches_any(p, approved_existing)]
    if unexpected_dirty:
        issues.append(
            "Unexpected uncommitted changes exist: " + ", ".join(unexpected_dirty)
        )
    elif dirty_paths:
        warnings.append("Only human-approved pre-existing worktree changes were detected.")

    report = {
        "schema_version": 1,
        "ok": not issues,
        "repository_root": str(root),
        "phase_file": str(phase_path),
        "phase_id": phase.get("phase_id"),
        "branch": branch,
        "baseline_commit": baseline_commit,
        "dirty_paths": dirty_paths,
        "unexpected_dirty_paths": unexpected_dirty,
        "issues": issues,
        "warnings": warnings,
    }

    print(f"Repository: {root}")
    print(f"Phase: {phase.get('phase_id')}")
    print(f"Branch: {branch}")
    for warning in warnings:
        print(f"WARNING: {warning}")
    for issue in issues:
        print(f"FAIL: {issue}")
    if not issues:
        print("PASS: Git and phase preflight completed successfully.")

    write_report(report, args.json_out)
    return 0 if not issues else 1


if __name__ == "__main__":
    raise SystemExit(main())
