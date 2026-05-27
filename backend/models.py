"""
LegacyLift AI — Pydantic v2 Models
All request/response models used across the agent pipeline.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class TestResult(BaseModel):
    name: str
    passed: bool | None = None
    error: str | None = None


class ComplexityInfo(BaseModel):
    total_lines: int = 0
    code_lines: int = 0
    comment_lines: int = 0
    blank_lines: int = 0
    num_functions: int = 0
    num_classes: int = 0
    avg_function_length: float = 0
    max_nesting_depth: int = 0
    cyclomatic_complexity: int = 0
    size_category: str = ""
    complexity_score: float = 0
    difficulty: str = ""
    estimated_effort_hours: float = 0
    source_lang: str = ""
    target_lang: str = ""


class ModernizeResponse(BaseModel):
    original_code: str
    modernized_code: str
    documentation: str
    unit_tests: str
    test_results: list[TestResult]
    confidence_score: float = Field(ge=0.0, le=1.0)
    change_summary: str
    complexity: ComplexityInfo | dict = {}
    architecture_diagram: str = ""


class SSEEvent(BaseModel):
    step: Literal[
        "parsing",
        "documenting",
        "rewriting",
        "testing",
        "validating",
        "done",
        "error",
    ]
    data: dict
    error: str | None = None


class ModernizeRequest(BaseModel):
    source_code: str
    source_lang: Literal["php", "cobol", "vb6", "perl", "fortran", "pascal", "java"]
    target_lang: Literal["python", "typescript", "go", "java"]
