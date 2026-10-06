#!/usr/bin/env python3
"""Package the verified brand kit without dependencies or machine-specific data."""
from pathlib import Path
from hashlib import sha256
import json
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    subprocess.run(["npm", "run", "verify"], cwd=ROOT, check=True)
    version = json.loads((ROOT / "package.json").read_text())["version"]
    tag = f"v{version}"
    destination = ROOT / "dist"
    destination.mkdir(exist_ok=True)
    archive = destination / f"raw-brand-assets-{tag}.zip"
    files = [ROOT / name for name in [
        "raw.svg", "LICENSE", "LICENSE-CODE", "NOTICE",
        "docs/ASSET-CATALOG.md", "docs/BRAND-GUIDELINES.md",
        "docs/WEBSITE.md", "docs/LICENSING.md", "docs/previews/brand-overview.png",
    ]]
    files += sorted(p for p in (ROOT / "assets").rglob("*") if p.is_file())
    readme = f"""# RAW Technologies LLC — brand kit {tag}

Complete logos in color, white, and black; one square profile image; website icons.

- Logos: assets/logos/ (SVG and 2048px transparent PNG).
- Social profile image: assets/social/raw-avatar-1024.png.
- Website installation: docs/WEBSITE.md.
- Brand usage: docs/BRAND-GUIDELINES.md.
- File inventory and hashes: assets/manifest.json.

Copyright (c) 2026 RAW Technologies LLC. Brand rights reserved under LICENSE.
Public download does not grant brand-use permission. Tooling/documentation terms:
LICENSE-CODE. Keep the complete logo intact and retain the rights notices.

Source and maintenance tooling: https://github.com/lucasmkrx/raw
"""
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        payloads = [(p.relative_to(ROOT).as_posix(), p.read_bytes()) for p in files]
        payloads.append(("README.md", readme.encode()))
        for name, data in sorted(payloads):
            entry = zipfile.ZipInfo(name, date_time=(2026, 10, 6, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            bundle.writestr(entry, data)
    digest = sha256(archive.read_bytes()).hexdigest()
    (destination / "SHA256SUMS.txt").write_text(f"{digest}  {archive.name}\n")
    print(f"Created {archive.name} and SHA256SUMS.txt ({len(payloads)} files).")


if __name__ == "__main__":
    main()
