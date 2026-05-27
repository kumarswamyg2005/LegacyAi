"""
LegacyLift AI — Pipeline Orchestrator
Runs the full modernization pipeline and yields SSE events for real-time progress.
"""

from __future__ import annotations

from typing import AsyncGenerator

from models import ModernizeResponse, SSEEvent
from prompts import CHANGE_SUMMARY_PROMPT

from agent.parser import parse_code
from agent.documenter import document_code
from agent.rewriter import rewrite_code
from agent.test_generator import generate_tests
from agent.validator import run_tests
from agent.complexity import estimate_complexity
from agent.diagram import generate_diagram


async def run_pipeline(
    source_code: str,
    source_lang: str,
    target_lang: str,
) -> AsyncGenerator[SSEEvent, None]:
    """
    Execute the full modernization pipeline:
    1. Parse → 2. Document → 3. Rewrite → 4. Generate Tests → 5. Validate → 6. Done

    Yields SSEEvent objects for real-time streaming to the frontend.
    """
    try:
        # Step 1 — PARSING
        yield SSEEvent(step="parsing", data={"message": "Extracting code structure..."})
        ast = parse_code(source_code, source_lang)
        funcs = [f["name"] for f in ast.get("functions", [])]
        classes = [c["name"] for c in ast.get("classes", [])]
        yield SSEEvent(
            step="parsing",
            data={
                "complete": True,
                "functions_found": len(funcs),
                "functions": funcs[:10],
                "classes": classes[:10],
                "summary": ast.get("summary", ""),
            },
        )

        # Step 2 — DOCUMENTING
        yield SSEEvent(step="documenting", data={"message": "Generating documentation..."})
        docs = await document_code(source_code, ast, source_lang)
        yield SSEEvent(step="documenting", data={"complete": True, "preview": docs[:500]})

        # Step 3 — REWRITING
        yield SSEEvent(
            step="rewriting",
            data={"message": f"Rewriting to {target_lang}..."},
        )
        modernized, confidence = await rewrite_code(
            source_code, docs, source_lang, target_lang
        )
        yield SSEEvent(
            step="rewriting",
            data={"complete": True, "confidence": confidence, "code_preview": modernized},
        )

        # Step 4 — TEST GENERATION
        yield SSEEvent(step="testing", data={"message": "Generating unit tests..."})
        tests = await generate_tests(source_code, modernized, docs, target_lang)
        yield SSEEvent(step="testing", data={"complete": True, "test_preview": tests[:500]})

        # Step 5 — VALIDATION
        yield SSEEvent(step="validating", data={"message": "Running tests..."})
        results = run_tests(modernized, tests, target_lang)
        passed = sum(1 for r in results if r.passed)
        yield SSEEvent(
            step="validating",
            data={"complete": True, "passed": passed, "total": len(results)},
        )

        # Step 6 — COMPLEXITY + DIAGRAM + SUMMARY
        yield SSEEvent(step="validating", data={"message": "Analyzing complexity & generating diagrams..."})
        complexity = estimate_complexity(source_code, ast, source_lang, target_lang)
        diagram = await generate_diagram(source_code, modernized, source_lang, target_lang, ast)
        change_summary = await generate_change_summary(source_code, modernized)

        final_response = ModernizeResponse(
            original_code=source_code,
            modernized_code=modernized,
            documentation=docs,
            unit_tests=tests,
            test_results=results,
            confidence_score=confidence,
            change_summary=change_summary,
            complexity=complexity,
            architecture_diagram=diagram,
        )
        yield SSEEvent(step="done", data=final_response.model_dump())

    except Exception as e:
        yield SSEEvent(step="error", data={}, error=str(e))


from agent.llm import call_llm_with_rotation

async def generate_change_summary(original: str, modernized: str) -> str:
    """Generate a concise change summary using OpenAI."""
    try:
        user_message = (
            f"<original>{original}</original>\n"
            f"<modernized>{modernized}</modernized>"
        )

        return await call_llm_with_rotation(
            max_tokens=500,
            temperature=0.2,
            messages=[
                {"role": "system", "content": CHANGE_SUMMARY_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )

    except Exception as e:
        return f"Change summary generation failed: {str(e)}"
