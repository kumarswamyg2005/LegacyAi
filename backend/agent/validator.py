"""
LegacyLift AI — Test Validator
Runs generated unit tests against modernized code in an isolated temp directory.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

from models import TestResult


def run_tests(modernized_code: str, test_code: str, lang: str) -> list[TestResult]:
    """
    Write modernized code + tests to a temp directory, run the appropriate
    test runner, parse the output, and return structured TestResult objects.
    Always cleans up the temp directory regardless of outcome.
    """
    tmp_dir = f"/tmp/legacylift_{uuid.uuid4().hex[:8]}"

    try:
        Path(tmp_dir).mkdir(parents=True, exist_ok=True)
        lang_lower = lang.lower().strip()

        if lang_lower == "python":
            return _run_python_tests(tmp_dir, modernized_code, test_code)
        elif lang_lower == "typescript":
            return _run_typescript_tests(tmp_dir, modernized_code, test_code)
        else:
            return _fallback_tests(test_code)

    except Exception as e:
        return [TestResult(name="runner_error", passed=False, error=f"Test runner failed: {str(e)}")]

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _run_python_tests(
    tmp_dir: str, modernized_code: str, test_code: str
) -> list[TestResult]:
    """Run Python tests using pytest."""
    # Write files
    Path(f"{tmp_dir}/main.py").write_text(modernized_code, encoding="utf-8")
    Path(f"{tmp_dir}/test_main.py").write_text(test_code, encoding="utf-8")

    # Run pytest
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "test_main.py", "--tb=short", "-v"],
        cwd=tmp_dir,
        timeout=15,
        capture_output=True,
        text=True,
    )

    results: list[TestResult] = []
    combined = result.stdout + "\n" + result.stderr
    lines = combined.split("\n")
    current_error_lines: list[str] = []
    last_failed_name: str | None = None

    for line in lines:
        # pytest -v format: "test_main.py::test_name PASSED [50%]"
        verbose_match = re.search(r"test_main\.py::(\S+)\s+(PASSED|FAILED)", line)
        if verbose_match:
            test_name = verbose_match.group(1)
            status = verbose_match.group(2)
            if status == "PASSED":
                if last_failed_name and current_error_lines:
                    _update_last_failed(results, last_failed_name, current_error_lines)
                    last_failed_name = None
                    current_error_lines = []
                results.append(TestResult(name=test_name, passed=True))
            else:
                if last_failed_name and current_error_lines:
                    _update_last_failed(results, last_failed_name, current_error_lines)
                last_failed_name = test_name
                current_error_lines = []
                results.append(TestResult(name=test_name, passed=False, error=None))
            continue

        # Short summary format: "FAILED test_main.py::test_name - AssertionError"
        summary_match = re.search(r"FAILED\s+test_main\.py::(\S+)(?:\s*-\s*(.+))?", line)
        if summary_match:
            test_name = summary_match.group(1)
            error_msg = (summary_match.group(2) or "").strip()
            # Only add if not already recorded from verbose output
            existing = [r for r in results if r.name == test_name]
            if existing:
                if error_msg:
                    for i, r in enumerate(results):
                        if r.name == test_name and not r.passed:
                            results[i] = TestResult(name=test_name, passed=False, error=error_msg)
                            break
            else:
                results.append(TestResult(name=test_name, passed=False, error=error_msg or None))
            continue

        # Collect error detail lines
        if line.strip().startswith("E ") and last_failed_name:
            current_error_lines.append(line.strip()[2:])

    if last_failed_name and current_error_lines:
        _update_last_failed(results, last_failed_name, current_error_lines)

    # Fallback if no tests were parsed
    if not results:
        if result.returncode == 0:
            results = [TestResult(name="all_tests", passed=True)]
        else:
            stderr_msg = result.stderr[:500] if result.stderr else result.stdout[:500]
            results = [TestResult(name="all_tests", passed=False, error=stderr_msg)]

    return results


def _update_last_failed(
    results: list[TestResult], name: str, error_lines: list[str]
) -> None:
    """Update the error message on the last failed test result."""
    error_msg = " | ".join(error_lines)
    for i in range(len(results) - 1, -1, -1):
        if results[i].name == name and not results[i].passed:
            results[i] = TestResult(name=name, passed=False, error=error_msg)
            break


def _run_typescript_tests(
    tmp_dir: str, modernized_code: str, test_code: str
) -> list[TestResult]:
    """Run TypeScript tests using Jest."""
    # Write source files
    Path(f"{tmp_dir}/index.ts").write_text(modernized_code, encoding="utf-8")
    Path(f"{tmp_dir}/index.test.ts").write_text(test_code, encoding="utf-8")

    # Write minimal package.json
    package_json = {
        "name": "test",
        "version": "1.0.0",
        "scripts": {"test": "jest"},
        "devDependencies": {
            "jest": "^29",
            "ts-jest": "^29",
            "typescript": "^5",
            "@types/jest": "^29",
        },
    }
    Path(f"{tmp_dir}/package.json").write_text(
        json.dumps(package_json, indent=2), encoding="utf-8"
    )

    # Write jest config
    jest_config = 'module.exports = { preset: "ts-jest", testEnvironment: "node" };\n'
    Path(f"{tmp_dir}/jest.config.js").write_text(jest_config, encoding="utf-8")

    # Run jest
    result = subprocess.run(
        ["npx", "--yes", "jest", "--no-coverage", "--passWithNoTests"],
        cwd=tmp_dir,
        timeout=30,
        capture_output=True,
        text=True,
    )

    results: list[TestResult] = []
    combined = result.stdout + "\n" + result.stderr

    for line in combined.split("\n"):
        check_match = re.search(r"[✓✔]\s+(.+?)(?:\s+\(\d+\s*ms\))?$", line)
        if check_match:
            results.append(
                TestResult(name=check_match.group(1).strip(), passed=True)
            )
            continue

        x_match = re.search(r"[✕✗×]\s+(.+?)(?:\s+\(\d+\s*ms\))?$", line)
        if x_match:
            results.append(
                TestResult(name=x_match.group(1).strip(), passed=False, error=None)
            )
            continue

    # Fallback
    if not results:
        if result.returncode == 0:
            results = [TestResult(name="all_tests", passed=True)]
        else:
            stderr_msg = result.stderr[:300] if result.stderr else result.stdout[:300]
            results = [TestResult(name="all_tests", passed=False, error=stderr_msg)]

    return results


def _fallback_tests(test_code: str) -> list[TestResult]:
    """Fallback for COBOL, VB6, or unknown languages."""
    pattern = re.compile(
        r"(?:Sub Test|Function Test|PROCEDURE TEST)[_\s](\w+)",
        re.IGNORECASE,
    )
    matches = pattern.findall(test_code)

    if not matches:
        return [
            TestResult(
                name="manual_review",
                passed=None,
                error="Manual verification required — automated runner not available for this language",
            )
        ]

    return [
        TestResult(
            name=name,
            passed=None,
            error="Manual verification required — automated runner not available for this language",
        )
        for name in matches
    ]
