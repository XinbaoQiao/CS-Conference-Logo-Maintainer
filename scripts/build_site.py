#!/usr/bin/env python3
"""Build the dependency-free GitHub Pages artifact.

The site intentionally consumes the maintained manifest directly.  This build
only packages the UI shell, manifest, and logo files into one self-contained
directory; it does not create a second conference database.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
import shutil
from typing import Any


ACTIVE_STATUSES = {"downloaded", "existing_target", "reused_existing"}
REQUIRED_SITE_FILES = {"index.html", "styles.css", "app.js"}


class SiteBuildError(RuntimeError):
    """Raised when the repository cannot produce a safe, complete site."""


def load_manifest(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SiteBuildError(f"cannot read {path}: {exc}") from exc
    if not isinstance(payload, dict) or not isinstance(payload.get("entries"), list):
        raise SiteBuildError(f"{path} must contain an entries array")
    return payload


def safe_logo_name(value: Any) -> str:
    name = str(value or "").strip()
    if not name:
        return ""
    candidate = Path(name)
    if candidate.is_absolute() or candidate.name != name or ".." in candidate.parts:
        raise SiteBuildError(f"unsafe logo_file path in manifest: {name!r}")
    return name


def validate_sources(root: Path) -> dict[str, Any]:
    site_source = root / "site"
    manifest_path = root / "manifest.json"
    logo_source = root / "assets" / "logos"

    missing_site_files = sorted(
        name for name in REQUIRED_SITE_FILES if not (site_source / name).is_file()
    )
    if missing_site_files:
        raise SiteBuildError(f"site source is missing: {', '.join(missing_site_files)}")
    if not logo_source.is_dir():
        raise SiteBuildError(f"logo directory does not exist: {logo_source}")

    manifest = load_manifest(manifest_path)
    entries = [entry for entry in manifest["entries"] if isinstance(entry, dict)]
    if len(entries) != len(manifest["entries"]):
        raise SiteBuildError("manifest entries must all be objects")

    entry_ids: set[tuple[str, str]] = set()
    duplicate_ids: list[tuple[str, str]] = []
    referenced_files: set[str] = set()
    available_entries = 0
    statuses: Counter[str] = Counter()

    for entry in entries:
        key = (str(entry.get("source_path") or ""), str(entry.get("title") or ""))
        if key in entry_ids:
            duplicate_ids.append(key)
        entry_ids.add(key)

        status = str(entry.get("status") or "unknown")
        statuses[status] += 1
        logo_name = safe_logo_name(entry.get("logo_file"))
        if not logo_name:
            continue
        logo_path = logo_source / logo_name
        if not logo_path.is_file():
            raise SiteBuildError(f"manifest references missing logo: {logo_name}")
        referenced_files.add(logo_name)
        if status in ACTIVE_STATUSES:
            available_entries += 1

    if duplicate_ids:
        rendered = ", ".join(f"{source}#{title}" for source, title in duplicate_ids[:5])
        raise SiteBuildError(f"manifest has duplicate stable entry IDs: {rendered}")

    return {
        "manifest": manifest,
        "entries": len(entries),
        "available_entries": available_entries,
        "unavailable_entries": len(entries) - available_entries,
        "referenced_logo_files": len(referenced_files),
        "statuses": dict(sorted(statuses.items())),
    }


def ensure_empty_output(output: Path, root: Path) -> None:
    resolved = output.resolve()
    protected = {
        root.resolve(),
        (root / "site").resolve(),
        (root / "assets").resolve(),
        (root / "assets" / "logos").resolve(),
    }
    if resolved in protected:
        raise SiteBuildError(f"refusing to use protected source directory as output: {resolved}")
    if output.is_symlink():
        raise SiteBuildError(f"output directory must not be a symbolic link: {output}")
    if output.exists():
        if not output.is_dir():
            raise SiteBuildError(f"output path is not a directory: {output}")
        if any(output.iterdir()):
            raise SiteBuildError(f"output directory must be absent or empty: {output}")
    output.mkdir(parents=True, exist_ok=True)


def build(root: Path, output: Path) -> dict[str, Any]:
    summary = validate_sources(root)
    ensure_empty_output(output, root)

    shutil.copytree(root / "site", output, dirs_exist_ok=True)
    shutil.copy2(root / "manifest.json", output / "manifest.json")
    shutil.copytree(root / "assets" / "logos", output / "assets" / "logos")
    shutil.copy2(root / "LICENSE", output / "LICENSE")
    (output / ".nojekyll").write_text("", encoding="utf-8")

    built_files = sum(1 for path in output.rglob("*") if path.is_file())
    summary = {key: value for key, value in summary.items() if key != "manifest"}
    summary["built_files"] = built_files
    summary["output"] = str(output)
    return summary


def parse_args() -> argparse.Namespace:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        help="empty destination directory for the deployable site artifact",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="validate site sources and manifest references without writing an artifact",
    )
    parser.set_defaults(root=root)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root)
    if args.check:
        summary = validate_sources(root)
        summary = {key: value for key, value in summary.items() if key != "manifest"}
    else:
        if args.output is None:
            raise SystemExit("--output is required unless --check is used")
        summary = build(root, args.output)
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SiteBuildError as exc:
        raise SystemExit(f"site build failed: {exc}") from exc
