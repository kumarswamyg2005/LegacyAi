"""
LegacyLift AI — Code Rewriter
Rewrites legacy code into modern target language using OpenAI,
then validates equivalence confidence using the same model.
"""

from __future__ import annotations

import json

from prompts import CONFIDENCE_PROMPT, REWRITE_PROMPT, REWRITE_USER_TEMPLATE


from agent.llm import call_llm_with_rotation


async def rewrite_code(
    source: str,
    docs: str,
    source_lang: str,
    target_lang: str,
) -> tuple[str, float]:
    """
    Rewrite legacy source code into modern target language code.

    1. Uses OpenAI for the code migration.
    2. Uses OpenAI for confidence scoring of the result.

    Returns (modernized_code, confidence_score).
    """
    user_message = REWRITE_USER_TEMPLATE.format(
        source_lang=source_lang,
        target_lang=target_lang,
        source_code=source,
        documentation=docs,
    )

    response_content = await call_llm_with_rotation(
        temperature=0.1,
        max_tokens=4000,
        messages=[
            {"role": "system", "content": REWRITE_PROMPT},
            {"role": "user", "content": user_message},
        ],
    )

    modernized_code = response_content

    # Strip markdown fences if the model included them
    modernized_code = _strip_markdown_fences(modernized_code)

    # Get confidence score
    confidence_score = await _get_confidence_score(source, modernized_code)

    return modernized_code, confidence_score


async def _get_confidence_score(original: str, modernized: str) -> float:
    """
    Use OpenAI to evaluate how confident we are that the rewrite
    is functionally equivalent to the original.
    """
    try:
        user_message = (
            f"<original>{original}</original>\n"
            f"<modernized>{modernized}</modernized>"
        )

        response_content = await call_llm_with_rotation(
            max_tokens=500,
            temperature=0.0,
            messages=[
                {"role": "system", "content": CONFIDENCE_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )

        raw_text = response_content.strip()
        parsed = json.loads(raw_text)
        score = float(parsed.get("score", 0.75))
        return max(0.0, min(1.0, score))

    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        return 0.75
    except Exception:
        return 0.75


def _strip_markdown_fences(code: str) -> str:
    """Remove markdown code fences if present."""
    code = code.strip()
    if code.startswith("```"):
        lines = code.split("\n")
        # Remove first line (```lang) and last line (```)
        if lines[-1].strip() == "```":
            lines = lines[1:-1]
        else:
            lines = lines[1:]
        code = "\n".join(lines)
    return code
