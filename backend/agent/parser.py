"""
LegacyLift AI — Code Parser
Parses legacy source code (PHP, COBOL, VB6) into structured AST data.
Uses tree-sitter for PHP, regex fallback for COBOL and VB6.
"""

from __future__ import annotations

import re
from typing import Any


def parse_code(source: str, lang: str) -> dict[str, Any]:
    """
    Parse legacy source code and extract functions, classes, imports,
    global variables, and a summary.

    Returns a structured dict. Never raises — returns partial results
    with an 'error' key on failure.
    """
    try:
        lang_lower = lang.lower().strip()
        if lang_lower == "php":
            return _parse_php(source)
        elif lang_lower == "cobol":
            return _parse_cobol(source)
        elif lang_lower == "vb6":
            return _parse_vb6(source)
        elif lang_lower == "perl":
            return _parse_perl(source)
        elif lang_lower == "fortran":
            return _parse_fortran(source)
        elif lang_lower == "pascal":
            return _parse_pascal(source)
        elif lang_lower == "java":
            return _parse_java(source)
        else:
            return _empty_result(error=f"Unsupported language: {lang}")
    except Exception as e:
        return _empty_result(error=f"Parser error: {str(e)}")


def _empty_result(error: str | None = None) -> dict[str, Any]:
    return {
        "functions": [],
        "classes": [],
        "imports": [],
        "global_vars": [],
        "summary": "",
        "error": error,
    }


def _parse_php(source: str) -> dict[str, Any]:
    """Parse PHP code using tree-sitter."""
    try:
        from tree_sitter_languages import get_language, get_parser

        get_language("php")
        parser = get_parser("php")
    except Exception:
        return _parse_php_regex(source)

    try:
        tree = parser.parse(source.encode("utf-8"))
        root = tree.root_node

        functions: list[dict] = []
        classes: list[dict] = []
        imports: list[str] = []
        global_vars: list[str] = []

        for node in _walk(root):
            if node.type == "function_definition":
                name_node = node.child_by_field_name("name")
                params_node = node.child_by_field_name("parameters")
                func_name = name_node.text.decode("utf-8") if name_node else "unknown"
                params = []
                if params_node:
                    for child in params_node.children:
                        if child.type in (
                            "simple_parameter",
                            "variadic_parameter",
                        ):
                            var_node = child.child_by_field_name("name")
                            if var_node:
                                params.append(var_node.text.decode("utf-8"))
                body = node.text.decode("utf-8")
                functions.append(
                    {
                        "name": func_name,
                        "params": params,
                        "body": body,
                        "line_start": node.start_point[0] + 1,
                        "line_end": node.end_point[0] + 1,
                    }
                )

            elif node.type == "class_declaration":
                name_node = node.child_by_field_name("name")
                cls_name = name_node.text.decode("utf-8") if name_node else "unknown"
                methods = []
                for child in _walk(node):
                    if child.type == "method_declaration":
                        m_name = child.child_by_field_name("name")
                        if m_name:
                            methods.append(m_name.text.decode("utf-8"))
                classes.append(
                    {
                        "name": cls_name,
                        "methods": methods,
                        "line_start": node.start_point[0] + 1,
                    }
                )

            elif node.type in ("include_expression", "include_once_expression",
                               "require_expression", "require_once_expression"):
                imports.append(node.text.decode("utf-8"))

            elif node.type == "expression_statement":
                text = node.text.decode("utf-8")
                if text.startswith("$") and "=" in text:
                    var_name = text.split("=")[0].strip()
                    if not any(var_name in f.get("body", "") for f in functions):
                        global_vars.append(var_name)

        func_count = len(functions)
        class_count = len(classes)
        summary = f"PHP module with {func_count} function(s) and {class_count} class(es)."

        return {
            "functions": functions,
            "classes": classes,
            "imports": imports,
            "global_vars": global_vars,
            "summary": summary,
            "error": None,
        }

    except Exception:
        return _parse_php_regex(source)


def _parse_php_regex(source: str) -> dict[str, Any]:
    """Fallback PHP parsing using regex."""
    functions: list[dict] = []
    pattern = re.compile(
        r"function\s+(\w+)\s*\(([^)]*)\)\s*\{",
        re.MULTILINE,
    )
    source.split("\n")
    for match in pattern.finditer(source):
        name = match.group(1)
        params_raw = match.group(2).strip()
        params = [p.strip() for p in params_raw.split(",") if p.strip()] if params_raw else []
        start_pos = match.start()
        line_start = source[:start_pos].count("\n") + 1
        brace_count = 0
        body_start = match.end() - 1
        body_end = body_start
        for i in range(body_start, len(source)):
            if source[i] == "{":
                brace_count += 1
            elif source[i] == "}":
                brace_count -= 1
                if brace_count == 0:
                    body_end = i + 1
                    break
        body = source[match.start():body_end]
        line_end = source[:body_end].count("\n") + 1
        functions.append(
            {
                "name": name,
                "params": params,
                "body": body,
                "line_start": line_start,
                "line_end": line_end,
            }
        )

    return {
        "functions": functions,
        "classes": [],
        "imports": [],
        "global_vars": [],
        "summary": f"PHP module with {len(functions)} function(s) (regex parsed).",
        "error": None if functions else "No functions found via regex fallback",
    }


def _parse_cobol(source: str) -> dict[str, Any]:
    """Parse COBOL code using regex — find PROCEDURE DIVISION paragraphs."""
    functions: list[dict] = []
    source.split("\n")

    paragraph_pattern = re.compile(r"^[A-Z0-9][-A-Z0-9]*\.\s*$", re.MULTILINE)
    matches = list(paragraph_pattern.finditer(source))

    for i, match in enumerate(matches):
        name = match.group(0).strip().rstrip(".")
        start_pos = match.start()
        line_start = source[:start_pos].count("\n") + 1

        if i + 1 < len(matches):
            end_pos = matches[i + 1].start()
        else:
            end_pos = len(source)

        body = source[match.start():end_pos].strip()
        line_end = source[:end_pos].count("\n") + 1

        functions.append(
            {
                "name": name,
                "params": [],
                "body": body,
                "line_start": line_start,
                "line_end": line_end,
            }
        )

    return {
        "functions": functions,
        "classes": [],
        "imports": [],
        "global_vars": [],
        "summary": f"COBOL module with {len(functions)} paragraph(s).",
        "error": None,
    }


def _parse_vb6(source: str) -> dict[str, Any]:
    """Parse VB6 code using regex — find Sub and Function blocks."""
    functions: list[dict] = []
    pattern = re.compile(
        r"(?:Public|Private)?\s*(?:Sub|Function)\s+(\w+)\s*\(([^)]*)\)",
        re.MULTILINE | re.IGNORECASE,
    )
    end_pattern = re.compile(
        r"End\s+(?:Sub|Function)",
        re.MULTILINE | re.IGNORECASE,
    )

    for match in pattern.finditer(source):
        name = match.group(1)
        params_raw = match.group(2).strip()
        params = [p.strip() for p in params_raw.split(",") if p.strip()] if params_raw else []
        start_pos = match.start()
        line_start = source[:start_pos].count("\n") + 1

        end_match = end_pattern.search(source, match.end())
        if end_match:
            body_end = end_match.end()
        else:
            body_end = len(source)

        body = source[start_pos:body_end]
        line_end = source[:body_end].count("\n") + 1

        functions.append(
            {
                "name": name,
                "params": params,
                "body": body,
                "line_start": line_start,
                "line_end": line_end,
            }
        )

    return {
        "functions": functions,
        "classes": [],
        "imports": [],
        "global_vars": [],
        "summary": f"VB6 module with {len(functions)} procedure(s).",
        "error": None,
    }


def _walk(node):
    """Recursively walk all nodes in a tree-sitter tree."""
    yield node
    for child in node.children:
        yield from _walk(child)


def _parse_perl(source: str) -> dict[str, Any]:
    """Parse Perl code using regex — find sub definitions."""
    functions: list[dict] = []
    pattern = re.compile(r"sub\s+(\w+)\s*\{", re.MULTILINE)

    for match in pattern.finditer(source):
        name = match.group(1)
        start_pos = match.start()
        line_start = source[:start_pos].count("\n") + 1
        brace_count = 0
        body_end = match.end() - 1
        for i in range(match.end() - 1, len(source)):
            if source[i] == "{":
                brace_count += 1
            elif source[i] == "}":
                brace_count -= 1
                if brace_count == 0:
                    body_end = i + 1
                    break
        body = source[match.start():body_end]
        line_end = source[:body_end].count("\n") + 1
        functions.append({
            "name": name, "params": [], "body": body,
            "line_start": line_start, "line_end": line_end,
        })

    imports = re.findall(r"^(?:use|require)\s+.+;", source, re.MULTILINE)

    return {
        "functions": functions, "classes": [], "imports": imports,
        "global_vars": [], "error": None,
        "summary": f"Perl module with {len(functions)} subroutine(s).",
    }


def _parse_fortran(source: str) -> dict[str, Any]:
    """Parse Fortran code using regex — find SUBROUTINE and FUNCTION blocks."""
    functions: list[dict] = []
    pattern = re.compile(
        r"(?:SUBROUTINE|FUNCTION)\s+(\w+)\s*\(([^)]*)\)",
        re.MULTILINE | re.IGNORECASE,
    )
    end_pattern = re.compile(r"END\s+(?:SUBROUTINE|FUNCTION)", re.IGNORECASE)

    for match in pattern.finditer(source):
        name = match.group(1)
        params_raw = match.group(2).strip()
        params = [p.strip() for p in params_raw.split(",") if p.strip()] if params_raw else []
        start_pos = match.start()
        line_start = source[:start_pos].count("\n") + 1
        end_match = end_pattern.search(source, match.end())
        body_end = end_match.end() if end_match else len(source)
        body = source[start_pos:body_end]
        line_end = source[:body_end].count("\n") + 1
        functions.append({
            "name": name, "params": params, "body": body,
            "line_start": line_start, "line_end": line_end,
        })

    return {
        "functions": functions, "classes": [], "imports": [],
        "global_vars": [], "error": None,
        "summary": f"Fortran module with {len(functions)} procedure(s).",
    }


def _parse_pascal(source: str) -> dict[str, Any]:
    """Parse Pascal/Delphi code using regex — find procedure and function blocks."""
    functions: list[dict] = []
    pattern = re.compile(
        r"(?:procedure|function)\s+(\w+)\s*(?:\(([^)]*)\))?",
        re.MULTILINE | re.IGNORECASE,
    )
    end_pattern = re.compile(r"\bend\s*;", re.IGNORECASE)

    for match in pattern.finditer(source):
        name = match.group(1)
        params_raw = (match.group(2) or "").strip()
        params = [p.strip() for p in params_raw.split(";") if p.strip()] if params_raw else []
        start_pos = match.start()
        line_start = source[:start_pos].count("\n") + 1
        end_match = end_pattern.search(source, match.end())
        body_end = end_match.end() if end_match else len(source)
        body = source[start_pos:body_end]
        line_end = source[:body_end].count("\n") + 1
        functions.append({
            "name": name, "params": params, "body": body,
            "line_start": line_start, "line_end": line_end,
        })

    imports = re.findall(r"^uses\s+.+;", source, re.MULTILINE | re.IGNORECASE)

    return {
        "functions": functions, "classes": [], "imports": imports,
        "global_vars": [], "error": None,
        "summary": f"Pascal module with {len(functions)} procedure(s).",
    }


def _parse_java(source: str) -> dict[str, Any]:
    """Parse legacy Java code using regex."""
    functions: list[dict] = []
    classes: list[dict] = []

    class_pattern = re.compile(r"(?:public|private|protected)?\s*class\s+(\w+)", re.MULTILINE)
    for match in class_pattern.finditer(source):
        cls_name = match.group(1)
        classes.append({"name": cls_name, "methods": [], "line_start": source[:match.start()].count("\n") + 1})

    method_pattern = re.compile(
        r"(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s]+)?\s*\{",
        re.MULTILINE,
    )

    for match in method_pattern.finditer(source):
        name = match.group(1)
        if name in ("if", "while", "for", "switch", "catch"):
            continue
        params_raw = match.group(2).strip()
        params = [p.strip().split()[-1] for p in params_raw.split(",") if p.strip()] if params_raw else []
        start_pos = match.start()
        line_start = source[:start_pos].count("\n") + 1
        brace_count = 0
        body_end = match.end() - 1
        for i in range(match.end() - 1, len(source)):
            if source[i] == "{":
                brace_count += 1
            elif source[i] == "}":
                brace_count -= 1
                if brace_count == 0:
                    body_end = i + 1
                    break
        body = source[start_pos:body_end]
        line_end = source[:body_end].count("\n") + 1
        functions.append({
            "name": name, "params": params, "body": body,
            "line_start": line_start, "line_end": line_end,
        })
        for cls in classes:
            if cls["line_start"] <= line_start:
                cls["methods"].append(name)

    imports = re.findall(r"^import\s+.+;", source, re.MULTILINE)

    return {
        "functions": functions, "classes": classes, "imports": imports,
        "global_vars": [], "error": None,
        "summary": f"Java module with {len(classes)} class(es) and {len(functions)} method(s).",
    }
