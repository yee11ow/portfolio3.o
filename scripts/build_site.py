#!/usr/bin/env python3
"""Regenerate the checked-in static website in its dependency order."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
for name in ['build_cases.py', 'build_developer.py', 'build_projects.py', 'build_shtorka.py', 'build_seo.py']:
    subprocess.run([sys.executable, str(ROOT / 'scripts' / name)], cwd=ROOT, check=True)
