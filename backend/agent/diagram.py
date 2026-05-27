"""
LegacyLift — Architecture Diagram Generator
Generates Mermaid diagrams showing code structure before and after migration.
"""

from __future__ import annotations

DIAGRAM_PROMPT = """You are a code architecture analyzer. Given original and modernized source code, generate a Mermaid diagram showing the structure.

Rules:
- Use `graph TD` (top-down) format
- Show classes, functions, and their relationships
- Use subgraphs with explicit IDs and labels, e.g., 'subgraph orig ["Original ({source_lang})"]' and 'subgraph mod ["Modernized ({target_lang})"]'
- Keep it clean and readable — max 30 nodes
- Only output the Mermaid code, no markdown fences, no explanation
- Use simple node IDs (A, B, C... or descriptive like Cart, Item)
- Connection arrows MUST be exactly `-->` or `-->|label|`. Do NOT append `>` after the label pipe (e.g. do NOT write `-->|label|>`).
- Do NOT use special characters (like `$`) in node labels without wrapping the label text in double quotes, e.g. use `B["$price"]` instead of `B[$price]`.
"""


from agent.llm import call_llm_with_rotation

async def generate_diagram(
    original: str,
    modernized: str,
    source_lang: str,
    target_lang: str,
    ast: dict,
) -> str:
    try:
        functions = [f["name"] for f in ast.get("functions", [])]
        classes = [c["name"] for c in ast.get("classes", [])]

        user_msg = (
            f"Source language: {source_lang}\n"
            f"Target language: {target_lang}\n"
            f"Functions found: {', '.join(functions) if functions else 'none'}\n"
            f"Classes found: {', '.join(classes) if classes else 'none'}\n\n"
            f"Original code:\n{original[:2000]}\n\n"
            f"Modernized code:\n{modernized[:2000]}"
        )

        response_content = await call_llm_with_rotation(
            max_tokens=1500,
            temperature=0.1,
            messages=[
                {"role": "system", "content": DIAGRAM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
        )

        diagram = response_content.strip()
        if diagram.startswith("```"):
            lines = diagram.split("\n")
            diagram = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        diagram = _sanitize_mermaid(diagram)

        if not diagram.startswith("graph"):
            return _fallback_diagram(ast, source_lang, target_lang)

        return diagram

    except Exception:
        return _fallback_diagram(ast, source_lang, target_lang)


def _sanitize_mermaid(diagram: str) -> str:
    import re
    # Remove markdown code block markers if any
    diagram = re.sub(r"^```mermaid\s*", "", diagram, flags=re.IGNORECASE)
    diagram = re.sub(r"^```\s*", "", diagram)
    diagram = re.sub(r"```$", "", diagram)
    
    lines = []
    for line in diagram.split("\n"):
        # Fix -->|label|> into -->|label|
        line = re.sub(r'-->\s*\|([^|]+)\|\s*>', r'-->|\1|', line)
        # Fix -->|label|--> into -->|label|
        line = re.sub(r'-->\s*\|([^|]+)\|\s*-->', r'-->|\1|', line)
        # Fix any trailing > on pipes
        line = re.sub(r'\|\s*>\s*(\w+)', r'| \1', line)
        # Fix unquoted labels with $ or other special chars
        # e.g., B[$price] -> B["$price"]
        line = re.sub(r'(\w+)\[\$([^\]]+)\]', r'\1["$\2"]', line)
        lines.append(line)
        
    return "\n".join(lines).strip()


def _fallback_diagram(ast: dict, source_lang: str, target_lang: str) -> str:
    lines = ["graph TD"]
    lines.append(f'    subgraph orig ["Original ({source_lang.upper()})"]')

    classes = ast.get("classes", [])
    functions = ast.get("functions", [])

    if classes:
        for i, cls in enumerate(classes):
            cid = f"C{i}"
            lines.append(f"        {cid}[{cls['name']}]")
            for j, method in enumerate(cls.get("methods", [])):
                mid = f"M{i}_{j}"
                lines.append(f"        {cid} --> {mid}[{method}]")
    elif functions:
        for i, fn in enumerate(functions[:15]):
            lines.append(f"        F{i}[{fn['name']}]")
        for i in range(len(functions[:15]) - 1):
            if i < 14:
                lines.append(f"        F{i} --> F{i+1}")

    lines.append("    end")
    lines.append(f'    subgraph mod ["Modernized ({target_lang.upper()})"]')

    if classes:
        for i, cls in enumerate(classes):
            cid = f"NC{i}"
            lines.append(f"        {cid}[{cls['name']}]")
    elif functions:
        for i, fn in enumerate(functions[:15]):
            lines.append(f"        NF{i}[{fn['name']}]")

    lines.append("    end")
    return "\n".join(lines)
