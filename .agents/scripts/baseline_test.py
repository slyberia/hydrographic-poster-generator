#!/usr/bin/env python3
"""Run approved verification commands and create an unapproved baseline report.

The script records evidence only. It never approves or classifies failures.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
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


def git_value(root: Path, *args: str) -> str:
    result = subprocess.run(["git", *args], cwd=root, text=True, capture_output=True, check=False)
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


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
        cases.append({
            "id": test_id,
            "status": status,
            "message": message,
            "classification": "unclassified" if status in {"failed", "error"} else "not_applicable",
        })
    return cases


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate an unapproved test baseline.")
    parser.add_argument("--root", default=".")
    parser.add_argument("--phase-file", default=".agents/state/current_phase.json")
    parser.add_argument("--commands-file", help="Override the commands file defined by phase state.")
    parser.add_argument("--output-dir", help="Override baseline output directory.")
    args = parser.parse_args()

    root = find_repo_root(Path(args.root).resolve())
    phase_path = root / args.phase_file
    phase = load_json(phase_path)

    if phase.get("status") != "approved" or phase.get("approved_by_human") is not True:
        print("FAIL: Phase must be human-approved before baseline generation.")
        return 2

    branch = git_value(root, "branch", "--show-current")
    commit = git_value(root, "rev-parse", "HEAD")
    if branch != phase.get("branch"):
        print(f"FAIL: Current branch '{branch}' does not match phase branch '{phase.get('branch')}'.")
        return 3
    if commit != phase.get("baseline_commit"):
        print(
            "FAIL: HEAD does not match the phase baseline_commit. "
            "Generate the baseline before implementation or update the phase through HITL review."
        )
        return 4

    commands_file = args.commands_file or phase.get("verification_commands_file")
    if not commands_file:
        print("FAIL: No verification command file configured.")
        return 5
    commands_path = root / commands_file
    config = load_json(commands_path)
    commands = [c for c in config.get("commands", []) if c.get("enabled", True)]
    if not commands:
        print("FAIL: Verification command file contains no enabled commands.")
        return 6

    phase_id = phase.get("phase_id", "unknown-phase")
    output_dir = Path(args.output_dir) if args.output_dir else root / ".agents/state/baselines" / phase_id
    if not output_dir.is_absolute():
        output_dir = root / output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    command_results: list[dict[str, Any]] = []
    all_cases: list[dict[str, Any]] = []

    for item in commands:
        name = item.get("name", "unnamed")
        argv = item.get("command")
        if not isinstance(argv, list) or not argv or not all(isinstance(x, str) for x in argv):
            print(f"FAIL: Command '{name}' must be a non-empty string array.")
            return 7
        cwd = root / item.get("cwd", ".")
        print(f"RUN: {name}: {argv} (cwd={cwd})")
        started = time.monotonic()
        result = subprocess.run(
            argv,
            cwd=cwd,
            text=True,
            capture_output=True,
            check=False,
        )
        duration = time.monotonic() - started
        stdout_path = output_dir / f"{name}.stdout.txt"
        stderr_path = output_dir / f"{name}.stderr.txt"
        stdout_path.write_text(result.stdout, encoding="utf-8", errors="replace")
        stderr_path.write_text(result.stderr, encoding="utf-8", errors="replace")

        junit_cases: list[dict[str, Any]] = []
        if item.get("junit_xml"):
            junit_path = root / item["junit_xml"]
            junit_cases = parse_junit(junit_path)
            all_cases.extend(junit_cases)

        command_results.append({
            "name": name,
            "cwd": str(cwd.relative_to(root)),
            "command": argv,
            "exit_code": result.returncode,
            "duration_seconds": round(duration, 3),
            "stdout_file": str(stdout_path.relative_to(root)),
            "stderr_file": str(stderr_path.relative_to(root)),
            "junit_xml": item.get("junit_xml"),
            "test_case_count": len(junit_cases),
            "classification": "unclassified" if result.returncode != 0 else "not_applicable",
        })
        print(f"RESULT: {name}: exit={result.returncode}, duration={duration:.2f}s")

    failed_commands = [c for c in command_results if c["exit_code"] != 0]
    failed_cases = [c for c in all_cases if c["status"] in {"failed", "error"}]

    is_clean = len(failed_commands) == 0 and len(failed_cases) == 0

    generated_at = datetime.now(timezone.utc).isoformat()
    report = {
        "schema_version": 1,
        "status": "approved" if is_clean else "unapproved",
        "approved_by_human": is_clean,
        "phase_id": phase_id,
        "branch": branch,
        "commit": commit,
        "generated_at": generated_at,
        "commands_file": str(commands_path.relative_to(root)),
        "commands": command_results,
        "test_cases": all_cases,
        "notes": "Auto-approved due to zero failures." if is_clean else "All failures remain unclassified until human review.",
    }

    prefix = "baseline_approved" if is_clean else "baseline_unapproved"
    json_path = output_dir / f"{prefix}.json"
    md_path = output_dir / f"{prefix}.md"
    json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    title = "Approved Baseline" if is_clean else "Unapproved Baseline"
    status_msg = "> This baseline was automatically approved because there were no failures." if is_clean else "> This baseline is not approved. Every failure is unclassified until human review."

    md_lines = [
        f"# {title}",
        "",
        f"- Phase: `{phase_id}`",
        f"- Branch: `{branch}`",
        f"- Commit: `{commit}`",
        f"- Generated: `{generated_at}`",
        f"- Failed commands: `{len(failed_commands)}`",
        f"- Failed/error test cases: `{len(failed_cases)}`",
        "",
        status_msg,
        "",
        "## Commands",
    ]
    for command in command_results:
        md_lines.extend([
            f"### {command['name']}",
            f"- Exit code: `{command['exit_code']}`",
            f"- Duration: `{command['duration_seconds']}` seconds",
            f"- Command: `{command['command']}`",
            f"- Classification: `{command['classification']}`",
            "",
        ])
    md_path.write_text("\n".join(md_lines), encoding="utf-8")

    if is_clean:
        print(f"APPROVED BASELINE: {json_path}")
    else:
        print(f"UNAPPROVED BASELINE: {json_path}")
        print("HITL REQUIRED: Review and approve through baseline_review.md before implementation.")
    
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
