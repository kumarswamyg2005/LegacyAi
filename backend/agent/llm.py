"""
LegacyLift AI — LLM Client & Rotation Utility
Uses OpenAI/ChatGPT models through the OpenAI API.
"""

from __future__ import annotations

import os
import openai
from typing import List, Dict, Any

DEFAULT_OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_FALLBACK_MODELS = [
    model.strip()
    for model in os.getenv("OPENAI_FALLBACK_MODELS", "").split(",")
    if model.strip()
]


def get_openai_client() -> openai.AsyncOpenAI:
    return openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

async def call_llm_with_rotation(
    messages: List[Dict[str, str]],
    model: str | None = None,
    temperature: float = 0.1,
    max_tokens: int = 1500,
) -> str:
    """
    Execute chat completions with OpenAI models.

    The function name is kept for compatibility with the existing pipeline.
    Fallback models can be supplied with OPENAI_FALLBACK_MODELS, separated by commas.
    """
    models_to_try = [model or DEFAULT_OPENAI_MODEL, *OPENAI_FALLBACK_MODELS]
    last_error = None
    client = get_openai_client()
    
    for current_model in models_to_try:
        try:
            response = await client.chat.completions.create(
                model=current_model,
                temperature=temperature,
                max_tokens=max_tokens,
                messages=messages,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            last_error = e
                
    raise last_error if last_error else Exception("OpenAI completion failed.")
