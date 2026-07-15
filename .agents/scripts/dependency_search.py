#!/usr/bin/env python3
"""Create a literal reference inventory for repository symbols.

This tool does not infer producer/consumer relationships. Every match is
reported as unclassified and requires agent or human review.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
from typing import Iterable

DEFAULT_EXTENSIONS = {
    ".py", ".pyi", ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".sql",
    ".yaml", ".yml", ".toml", ".ini", ".cfg", ".css", ".scss", ".html",
}
DEFAULT_EXCLUDED_DIRS = {
    ".git", ".venv", "venv", "node_modules", "dist", "build", "__pycache__",
    ".next", ".pytest_cache", ".mypy_cache", ".ruff_cache",
}


def find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / ".git").exists():
            return candidate
    return current


def iter_files(root: Path, extensions: set[str], excluded_dirs: set[str], max_bytes: int) -> Iterable[Path]:
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in excluded_dirs for part in path.parts):
            continue
        if path.suffix.lower() not in extensions:
            continue
        try:
            if path.stat().st_size > max_bytes:
                continue
        except OSError:
            continue
        yield path


def search_file(path: Path, symbols: list[str], ignore_case: bool, context_lines: int) -> list[dict]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []

    lines = text.splitlines()
    results: list[dict] = []
    search_symbols = [s.lower() for s in symbols] if ignore_case else symbols

    for index, line in enumerate(lines):
        haystack = line.lower() if ignore_case else line
        for original, needle in zip(symbols, search_symbols):
            if needle not in haystack:
                continue
            start = max(0, index - context_lines)
            end = min(len(lines), index + context_lines + 1)
            results.append({
                "symbol": original,
                "file": str(path),
                "line": index + 1,
                "context": "\n".join(
                    f"{line_no + 1}: {lines[line_no]}" for line_no in range(start, end)
                ),
                "classification": "unclassified",
                "review_required": True,
            })
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Create an unclassified repository reference inventory.")
    parser.add_argument("symbols", nargs="+", help="Literal symbols or strings to search for.")
    parser.add_argument("--root", default=".", help="Repository root or a path inside it.")
    parser.add_argument("--ignore-case", action="store_true")
    parser.add_argument("--context-lines", type=int, default=2)
    parser.add_argument("--max-file-mb", type=float, default=2.0)
    parser.add_argument("--extensions", nargs="*", default=sorted(DEFAULT_EXTENSIONS))
    parser.add_argument("--exclude-dir", action="append", default=[])
    parser.add_argument("--json-out", help="Optional JSON output path.")
    parser.add_argument("--text-out", help="Optional text output path.")
    args = parser.parse_args()

    root = find_repo_root(Path(args.root))
    extensions = {ext if ext.startswith(".") else f".{ext}" for ext in args.extensions}
    excluded = DEFAULT_EXCLUDED_DIRS | set(args.exclude_dir)
    max_bytes = int(args.max_file_mb * 1024 * 1024)

    matches: list[dict] = []
    for path in iter_files(root, extensions, excluded, max_bytes):
        matches.extend(search_file(path, args.symbols, args.ignore_case, args.context_lines))

    for match in matches:
        try:
            match["file"] = str(Path(match["file"]).resolve().relative_to(root))
        except ValueError:
            pass

    report = {
        "schema_version": 1,
        "repository_root": str(root),
        "symbols": args.symbols,
        "match_count": len(matches),
        "matches": matches,
        "warning": "This is a reference inventory, not a completed dependency map.",
    }

    text_lines = [
        f"Repository: {root}",
        f"Symbols: {', '.join(args.symbols)}",
        f"Matches: {len(matches)}",
        "WARNING: Results are unclassified and require review.",
        "",
    ]
    for item in matches:
        text_lines.extend([
            f"Symbol: {item['symbol']}",
            f"File: {item['file']}",
            f"Line: {item['line']}",
            "Classification: unclassified",
            item["context"],
            "-" * 72,
        ])
    text_report = "\n".join(text_lines)

    print(text_report)
    if args.json_out:
        out = Path(args.json_out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if args.text_out:
        out = Path(args.text_out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text_report, encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
