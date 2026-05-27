"""
LegacyLift — Cost/Complexity Estimation
Analyzes source code to produce migration complexity scores and effort estimates.
"""

from __future__ import annotations

import re
from typing import Any


def estimate_complexity(source: str, ast: dict, source_lang: str, target_lang: str) -> dict[str, Any]:
    lines = source.strip().split("\n")
    total_lines = len(lines)
    code_lines = sum(1 for line in lines if line.strip() and not _is_comment(line.strip(), source_lang))
    blank_lines = sum(1 for line in lines if not line.strip())
    comment_lines = total_lines - code_lines - blank_lines

    functions = ast.get("functions", [])
    classes = ast.get("classes", [])
    num_functions = len(functions)
    num_classes = len(classes)

    avg_function_length = 0
    if functions:
        lengths = []
        for f in functions:
            body = f.get("body", "")
            lengths.append(len(body.strip().split("\n")))
        avg_function_length = round(sum(lengths) / len(lengths), 1)

    nesting_depth = _max_nesting(source, source_lang)
    cyclomatic = _estimate_cyclomatic(source)

    if code_lines < 50:
        size_category = "Small"
    elif code_lines < 200:
        size_category = "Medium"
    elif code_lines < 1000:
        size_category = "Large"
    else:
        size_category = "Very Large"

    raw_score = (
        min(code_lines / 100, 5) * 2 +
        min(num_functions / 5, 5) * 1.5 +
        min(nesting_depth / 3, 5) * 2 +
        min(cyclomatic / 10, 5) * 2.5 +
        (3 if source_lang == "cobol" else 1 if source_lang == "vb6" else 0.5) +
        (1 if target_lang in ("go", "java") else 0)
    )
    complexity_score = round(min(raw_score, 10), 1)

    if complexity_score <= 3:
        difficulty = "Low"
        effort_hours = round(code_lines * 0.02, 1)
    elif complexity_score <= 6:
        difficulty = "Medium"
        effort_hours = round(code_lines * 0.05, 1)
    elif complexity_score <= 8:
        difficulty = "High"
        effort_hours = round(code_lines * 0.1, 1)
    else:
        difficulty = "Very High"
        effort_hours = round(code_lines * 0.2, 1)

    effort_hours = max(0.5, effort_hours)

    return {
        "total_lines": total_lines,
        "code_lines": code_lines,
        "comment_lines": comment_lines,
        "blank_lines": blank_lines,
        "num_functions": num_functions,
        "num_classes": num_classes,
        "avg_function_length": avg_function_length,
        "max_nesting_depth": nesting_depth,
        "cyclomatic_complexity": cyclomatic,
        "size_category": size_category,
        "complexity_score": complexity_score,
        "difficulty": difficulty,
        "estimated_effort_hours": effort_hours,
        "source_lang": source_lang,
        "target_lang": target_lang,
    }


def _is_comment(line: str, lang: str) -> bool:
    if lang == "php":
        return line.startswith("//") or line.startswith("#") or line.startswith("/*") or line.startswith("*")
    elif lang == "cobol":
        return len(line) > 6 and line[6] == "*"
    elif lang == "vb6":
        return line.startswith("'") or line.upper().startswith("REM ")
    return False


def _max_nesting(source: str, lang: str) -> int:
    max_depth = 0
    current = 0
    if lang in ("php", "java"):
        for ch in source:
            if ch == "{":
                current += 1
                max_depth = max(max_depth, current)
            elif ch == "}":
                current = max(0, current - 1)
    elif lang == "vb6":
        for line in source.split("\n"):
            stripped = line.strip().upper()
            if any(stripped.startswith(k) for k in ("IF ", "FOR ", "DO ", "WHILE ", "SELECT ")):
                current += 1
                max_depth = max(max_depth, current)
            elif any(stripped.startswith(k) for k in ("END IF", "NEXT ", "LOOP", "WEND", "END SELECT")):
                current = max(0, current - 1)
    else:
        for line in source.split("\n"):
            indent = len(line) - len(line.lstrip())
            depth = indent // 4
            max_depth = max(max_depth, depth)
    return max_depth


def _estimate_cyclomatic(source: str) -> int:
    keywords = [r"\bif\b", r"\belseif\b", r"\belse\s+if\b", r"\bfor\b", r"\bforeach\b",
                r"\bwhile\b", r"\bcase\b", r"\bcatch\b", r"\b\?\?", r"\b\?\s*:", r"\band\b", r"\bor\b",
                r"\b&&\b", r"\b\|\|\b"]
    count = 1
    for pattern in keywords:
        count += len(re.findall(pattern, source, re.IGNORECASE))
    return count
