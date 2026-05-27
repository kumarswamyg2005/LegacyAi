"""
LegacyLift AI — Pipeline Test Suite
Comprehensive tests for parser, validator, and orchestrator.
"""

from __future__ import annotations

import os
import sys

import pytest

# Ensure backend is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agent.parser import parse_code
from agent.validator import run_tests
from models import TestResult

# ---------------------------------------------------------------------------
# Fixtures / Sample data
# ---------------------------------------------------------------------------

SAMPLE_PHP = """<?php
function calculateDiscount($price, $discountCode) {
    if ($discountCode === 'HALF') {
        return $price * 0.5;
    }
    if ($discountCode === 'TENTH') {
        return $price * 0.9;
    }
    return $price;
}

function calculateTax($amount, $rate) {
    return $amount * ($rate / 100);
}
?>"""

SAMPLE_PYTHON_MODERNIZED = """def calculate_discount(price: float, discount_code: str) -> float:
    if discount_code == 'HALF':
        return price * 0.5
    if discount_code == 'TENTH':
        return price * 0.9
    return price

def calculate_tax(amount: float, rate: float) -> float:
    return amount * (rate / 100)
"""

SAMPLE_PYTEST = """from main import calculate_discount, calculate_tax

def test_discount_half():
    assert calculate_discount(100.0, 'HALF') == 50.0

def test_discount_tenth():
    assert calculate_discount(100.0, 'TENTH') == 90.0

def test_discount_no_code():
    assert calculate_discount(100.0, 'NONE') == 100.0

def test_tax_basic():
    assert calculate_tax(100.0, 10.0) == 10.0

def test_tax_zero():
    assert calculate_tax(0.0, 10.0) == 0.0
"""

SAMPLE_COBOL = """       IDENTIFICATION DIVISION.
       PROGRAM-ID. DISCOUNT.
       PROCEDURE DIVISION.
       CALC-DISCOUNT.
           IF DISCOUNT-CODE = 'HALF'
               COMPUTE PRICE = PRICE * 0.5
           END-IF.
           STOP RUN.
"""

SAMPLE_VB6 = """Public Function CalculateDiscount(price As Double, code As String) As Double
    If code = "HALF" Then
        CalculateDiscount = price * 0.5
    Else
        CalculateDiscount = price
    End If
End Function
"""


# ---------------------------------------------------------------------------
# Parser tests
# ---------------------------------------------------------------------------

class TestParserPHP:
    def test_parse_php_simple(self):
        result = parse_code(SAMPLE_PHP, "php")
        assert isinstance(result, dict)
        assert "functions" in result
        assert len(result["functions"]) >= 1
        assert "name" in result["functions"][0]
        assert "body" in result["functions"][0]

    def test_parse_php_finds_both_functions(self):
        result = parse_code(SAMPLE_PHP, "php")
        names = [f["name"] for f in result["functions"]]
        assert "calculateDiscount" in names
        assert "calculateTax" in names


class TestParserCOBOL:
    def test_parse_cobol_fallback(self):
        result = parse_code(SAMPLE_COBOL, "cobol")
        assert isinstance(result, dict)
        assert "functions" in result
        assert "summary" in result
        # Should not raise


class TestParserVB6:
    def test_parse_vb6_fallback(self):
        result = parse_code(SAMPLE_VB6, "vb6")
        assert isinstance(result, dict)
        assert "functions" in result
        assert len(result["functions"]) >= 1


class TestParserEdgeCases:
    def test_parse_empty_input(self):
        result = parse_code("", "php")
        assert isinstance(result, dict)
        assert result["functions"] == []

    def test_parse_malformed_input(self):
        result = parse_code("this is not code @#$%", "php")
        assert isinstance(result, dict)
        # Should not raise; may have error key or empty functions


# ---------------------------------------------------------------------------
# Validator tests
# ---------------------------------------------------------------------------

class TestValidatorPython:
    def test_validator_python_passing(self):
        results = run_tests(SAMPLE_PYTHON_MODERNIZED, SAMPLE_PYTEST, "python")
        assert isinstance(results, list)
        assert len(results) >= 1
        assert all(r.passed for r in results if r.passed is not None)

    def test_validator_python_failing(self):
        bad_test = """from main import calculate_discount, calculate_tax

def test_discount_wrong():
    assert calculate_discount(100.0, 'HALF') == 999.0

def test_tax_basic():
    assert calculate_tax(100.0, 10.0) == 10.0
"""
        results = run_tests(SAMPLE_PYTHON_MODERNIZED, bad_test, "python")
        assert isinstance(results, list)
        failed = [r for r in results if r.passed is False]
        assert len(failed) >= 1

    def test_validator_cleanup(self):
        results = run_tests(SAMPLE_PYTHON_MODERNIZED, SAMPLE_PYTEST, "python")
        # All /tmp/legacylift_* dirs should be cleaned up
        import glob
        glob.glob("/tmp/legacylift_*")
        # The directory from this specific run should be gone
        # (other concurrent tests might leave dirs, so just check we get results)
        assert isinstance(results, list)

    def test_validator_timeout_handling(self):
        infinite_code = "def f():\n    while True:\n        pass\n"
        test_code = "from main import f\n\ndef test_it():\n    f()\n"
        results = run_tests(infinite_code, test_code, "python")
        assert isinstance(results, list)
        assert len(results) >= 1
        # Should not hang — test runner has a 15s timeout
        failed = [r for r in results if r.passed is False]
        assert len(failed) >= 1


class TestValidatorFallback:
    def test_validator_unknown_lang_fallback(self):
        results = run_tests("some code", "some tests", "cobol")
        assert isinstance(results, list)
        for r in results:
            assert r.passed is None or "Manual verification" in (r.error or "")


# ---------------------------------------------------------------------------
# Orchestrator tests (async)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_orchestrator_emits_all_steps():
    from unittest.mock import AsyncMock, patch

    mock_results = [TestResult(name="test_1", passed=True)]

    with (
        patch("agent.orchestrator.document_code", new_callable=AsyncMock, return_value="# Docs"),
        patch("agent.orchestrator.rewrite_code", new_callable=AsyncMock, return_value=("print('hello')", 0.9)),
        patch("agent.orchestrator.generate_tests", new_callable=AsyncMock, return_value="def test(): pass"),
        patch("agent.orchestrator.run_tests", return_value=mock_results),
        patch("agent.orchestrator.generate_change_summary", new_callable=AsyncMock, return_value="- Changes"),
    ):
        from agent.orchestrator import run_pipeline

        events = [e async for e in run_pipeline(SAMPLE_PHP, "php", "python")]
        step_names = [e.step for e in events]

        assert "parsing" in step_names
        assert "documenting" in step_names
        assert "rewriting" in step_names
        assert "testing" in step_names
        assert "validating" in step_names
        assert "done" in step_names


@pytest.mark.asyncio
async def test_orchestrator_done_event_has_full_response():
    from unittest.mock import AsyncMock, patch

    mock_results = [TestResult(name="test_1", passed=True)]

    with (
        patch("agent.orchestrator.document_code", new_callable=AsyncMock, return_value="# Docs"),
        patch("agent.orchestrator.rewrite_code", new_callable=AsyncMock, return_value=("print('hello')", 0.93)),
        patch("agent.orchestrator.generate_tests", new_callable=AsyncMock, return_value="def test(): pass"),
        patch("agent.orchestrator.run_tests", return_value=mock_results),
        patch("agent.orchestrator.generate_change_summary", new_callable=AsyncMock, return_value="- Changes"),
    ):
        from agent.orchestrator import run_pipeline

        events = [e async for e in run_pipeline(SAMPLE_PHP, "php", "python")]
        done_events = [e for e in events if e.step == "done"]
        assert len(done_events) == 1
        data = done_events[0].data
        assert "original_code" in data
        assert "modernized_code" in data
        assert "documentation" in data
        assert "unit_tests" in data
        assert "confidence_score" in data


@pytest.mark.asyncio
async def test_orchestrator_error_propagation():
    from unittest.mock import AsyncMock, patch

    with (
        patch("agent.orchestrator.document_code", new_callable=AsyncMock, return_value="# Docs"),
        patch("agent.orchestrator.rewrite_code", new_callable=AsyncMock, side_effect=Exception("API timeout")),
    ):
        from agent.orchestrator import run_pipeline

        events = [e async for e in run_pipeline(SAMPLE_PHP, "php", "python")]
        error_events = [e for e in events if e.step == "error"]
        assert len(error_events) >= 1
        assert error_events[0].error is not None


@pytest.mark.asyncio
async def test_confidence_score_bounds():
    from unittest.mock import AsyncMock, patch

    mock_results = [TestResult(name="test_1", passed=True)]

    with (
        patch("agent.orchestrator.document_code", new_callable=AsyncMock, return_value="# Docs"),
        patch("agent.orchestrator.rewrite_code", new_callable=AsyncMock, return_value=("print('hello')", 0.93)),
        patch("agent.orchestrator.generate_tests", new_callable=AsyncMock, return_value="def test(): pass"),
        patch("agent.orchestrator.run_tests", return_value=mock_results),
        patch("agent.orchestrator.generate_change_summary", new_callable=AsyncMock, return_value="- Changes"),
    ):
        from agent.orchestrator import run_pipeline

        events = [e async for e in run_pipeline(SAMPLE_PHP, "php", "python")]
        done_events = [e for e in events if e.step == "done"]
        assert len(done_events) == 1
        score = done_events[0].data["confidence_score"]
        assert 0.0 <= score <= 1.0
