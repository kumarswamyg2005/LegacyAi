"""
LegacyLift AI — Code Documenter
Generates markdown documentation from parsed legacy source code using OpenAI.
"""

from __future__ import annotations

import json

from prompts import DOCUMENT_PROMPT


from agent.llm import call_llm_with_rotation

async def document_code(source: str, ast: dict, lang: str) -> str:
    """
    Generate comprehensive markdown documentation for the given legacy source code.

    Uses OpenAI with DOCUMENT_PROMPT as the system message.
    Returns markdown documentation string, or an error message on failure.
    """
    try:
        user_message = (
            f"Language: {lang}\n\n"
            f"<code>{source}</code>\n\n"
            f"<ast>{json.dumps(ast, indent=2)}</ast>"
        )

        return await call_llm_with_rotation(
            max_tokens=2000,
            temperature=0.2,
            messages=[
                {"role": "system", "content": DOCUMENT_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )

    except Exception as e:
        return f"Documentation generation failed: {str(e)}"
