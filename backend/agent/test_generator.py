"""
LegacyLift AI — Test Generator
Generates unit tests for modernized code using OpenAI.
"""

from __future__ import annotations

from prompts import TEST_PROMPT, TEST_USER_TEMPLATE


from agent.llm import call_llm_with_rotation

async def generate_tests(
    original: str,
    modernized: str,
    docs: str,
    target_lang: str,
) -> str:
    """
    Generate comprehensive unit tests for the modernized code.

    Uses OpenAI with TEST_PROMPT as system message.
    Returns the test file content as a string.
    On error, returns a minimal valid test file with a skipped test.
    """
    try:
        user_message = TEST_USER_TEMPLATE.format(
            original_code=original,
            modernized_code=modernized,
            documentation=docs,
            target_lang=target_lang,
        )

        response_content = await call_llm_with_rotation(
            max_tokens=2000,
            temperature=0.2,
            messages=[
                {"role": "system", "content": TEST_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )

        test_code = response_content

        # Strip markdown fences if the model included them
        test_code = _strip_markdown_fences(test_code)

        return test_code

    except Exception as e:
        return _minimal_test_file(target_lang, str(e))


def _strip_markdown_fences(code: str) -> str:
    """Remove markdown code fences if present."""
    code = code.strip()
    if code.startswith("```"):
        lines = code.split("\n")
        if lines[-1].strip() == "```":
            lines = lines[1:-1]
        else:
            lines = lines[1:]
        code = "\n".join(lines)
    return code


def _minimal_test_file(lang: str, error_msg: str) -> str:
    """Return a minimal valid test file with a skipped test containing the error."""
    safe_msg = error_msg.replace('"', '\\"').replace("'", "\\'")

    if lang == "python":
        return (
            "import pytest\n\n"
            f'@pytest.mark.skip(reason="Test generation failed: {safe_msg}")\n'
            "def test_placeholder():\n"
            "    pass\n"
        )
    elif lang == "typescript":
        return (
            f'describe("Generated Tests", () => {{\n'
            f'  it.skip("Test generation failed: {safe_msg}", () => {{\n'
            f"    expect(true).toBe(true);\n"
            f"  }});\n"
            f"}});\n"
        )
    elif lang == "go":
        return (
            'package main\n\n'
            'import "testing"\n\n'
            f'func TestPlaceholder(t *testing.T) {{\n'
            f'    t.Skip("Test generation failed: {safe_msg}")\n'
            f'}}\n'
        )
    elif lang == "java":
        return (
            'import org.junit.jupiter.api.Test;\n'
            'import org.junit.jupiter.api.Disabled;\n\n'
            'class GeneratedTests {\n'
            f'    @Disabled("Test generation failed: {safe_msg}")\n'
            '    @Test\n'
            '    void testPlaceholder() {\n'
            '    }\n'
            '}\n'
        )
    else:
        return f"// Test generation failed: {safe_msg}\n"
