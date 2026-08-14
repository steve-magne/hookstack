#!/usr/bin/env python3
# @hookstack task-completed-test-gate
"""Blocks task completion if the pytest suite fails (TaskCompleted). Python-only variant."""
import json
import os
import subprocess
import sys

PY_MARKERS = ["pyproject.toml", "setup.py", "setup.cfg", "pytest.ini"]


def _exec(cmd, timeout=120):
    return subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=timeout, check=True
    )


# Le gate Python ne s'arme que si le projet déclare réellement des tests
# (pytest.ini explicite ou dossier tests/) — sinon `uv run pytest` exit 5
# (no tests ran) bloquerait la complétion de chaque tâche sur un projet sans
# test. pyproject.toml seul ne suffit pas : tout projet uv en possède un.
def _has_python_tests(exists, project_dir):
    if not any(exists(f) for f in PY_MARKERS):
        return False
    if exists("pytest.ini"):
        return True
    return exists("tests") or exists("test")


def run(input_data, *, exec_cmd=None, exists=None, project_dir=None):
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    if exists is None:
        exists = lambda f: os.path.exists(os.path.join(project_dir, f))
    if exec_cmd is None:
        exec_cmd = _exec

    if not _has_python_tests(exists, project_dir):
        return None

    try:
        exec_cmd("uv run pytest -q")
    except subprocess.CalledProcessError as err:
        out = (err.stdout or err.stderr or str(err))[:800]
        subject = (input_data or {}).get("task_subject", "")
        return {
            "exitCode": 2,
            "message": f'Tests must pass before completing "{subject}".\n{out}',
        }
    return None


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stderr.write(result["message"])
        sys.exit(result["exitCode"])
