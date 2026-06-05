"""Gemini 2.5 Flash LLM client with structured JSON output.

Single-provider client: the platform uses Google's Gemini 2.5 Flash for
all LLM calls (question generation, evaluation, decision, roadmap, parsing).
Structured output is enforced by (a) embedding a JSON schema example in the
prompt, (b) instructing JSON-only output, and (c) validating the result with
Pydantic. A single corrective retry is performed on validation failure.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Type, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)

# Single model for the entire platform.
GEMINI_MODEL = "gemini-2.5-flash"


class LLMError(RuntimeError):
    pass


class LLMClient:
    """Async wrapper around the Gemini 2.5 Flash API."""

    def __init__(self) -> None:
        s = get_settings()
        if not s.gemini_api_key:
            raise LLMError("GEMINI_API_KEY not set")
        self._client = genai.Client(api_key=s.gemini_api_key)

    async def generate(
        self,
        *,
        system: str,
        user: str | None = None,
        contents: Any | None = None,
        model: str | None = None,
        temperature: float = 0.4,
        max_tokens: int = 1500,
        response_mime_type: str | None = None,
    ) -> str:
        config = types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
            max_output_tokens=max_tokens,
            response_mime_type=response_mime_type,
        )
        model_name = model or GEMINI_MODEL
        payload = contents if contents is not None else user
        try:
            resp = await self._client.aio.models.generate_content(
                model=model_name,
                contents=payload,
                config=config,
            )
            return resp.text or ""
        except Exception as exc:
            if model_name == "gemini-2.5-flash":
                logger.warning("Gemini 2.5 Flash failed (exc=%s). Falling back to gemini-2.5-flash-lite...", exc)
                try:
                    resp = await self._client.aio.models.generate_content(
                        model="gemini-2.5-flash-lite",
                        contents=payload,
                        config=config,
                    )
                    return resp.text or ""
                except Exception as fallback_exc:
                    logger.error("Gemini 2.5 Flash Lite fallback failed: %s", fallback_exc)
                    raise LLMError(f"Gemini call failed: {fallback_exc}") from fallback_exc
            raise LLMError(f"Gemini call failed: {exc}") from exc

    async def generate_structured(
        self,
        *,
        system: str,
        user: str | None = None,
        contents: Any | None = None,
        schema: Type[T],
        model: str | None = None,
        temperature: float = 0.3,
    ) -> T:
        """Generate + validate a Pydantic model. Retries once on parse failure."""
        json_system = (
            system
            + "\n\nReturn ONLY valid JSON. Do not include prose, code fences, or commentary."
        )
        schema_hint = (
            f"Target JSON schema (example shape):\n"
            f"{json.dumps(schema.model_json_schema(), indent=2)}"
        )

        payload = contents if contents is not None else user
        if payload is None:
            raise ValueError("Either user or contents must be provided")

        if isinstance(payload, list):
            formatted_payload = list(payload)
            appended = False
            for i, item in enumerate(formatted_payload):
                if isinstance(item, str):
                    formatted_payload[i] = f"{item}\n\n{schema_hint}"
                    appended = True
                    break
            if not appended:
                formatted_payload.append(schema_hint)
        else:
            formatted_payload = f"{payload}\n\n{schema_hint}"

        raw = await self.generate(
            system=json_system,
            contents=formatted_payload,
            model=model,
            temperature=temperature,
            max_tokens=4000,
            response_mime_type="application/json",
        )

        try:
            return _parse_and_validate(raw, schema)
        except (ValidationError, json.JSONDecodeError) as exc:
            logger.warning("LLM output failed validation or JSON decoding, retrying once. err=%s", exc)
            if isinstance(payload, list):
                corrective_payload = list(payload)
                appended = False
                for i, item in enumerate(corrective_payload):
                    if isinstance(item, str):
                        corrective_payload[i] = (
                            f"{item}\n\nYour previous output was invalid JSON. "
                            f"Validation errors (first 3): {exc.errors()[:3] if hasattr(exc, 'errors') else str(exc)}.\n"
                            f"Return ONLY valid JSON matching the schema. {schema_hint}"
                        )
                        appended = True
                        break
                if not appended:
                    corrective_payload.append(schema_hint)
            else:
                corrective_payload = (
                    f"{payload}\n\nYour previous output was invalid JSON. "
                    f"Validation errors (first 3): {exc.errors()[:3] if hasattr(exc, 'errors') else str(exc)}.\n"
                    f"Return ONLY valid JSON matching the schema. {schema_hint}"
                )

            raw2 = await self.generate(
                system=json_system,
                contents=corrective_payload,
                model=model,
                temperature=0.1,
                max_tokens=4000,
                response_mime_type="application/json",
            )
            return _parse_and_validate(raw2, schema)


def _parse_and_validate(raw: str, schema: Type[T]) -> T:
    text = raw.strip()
    # Strip code fences if the model wraps JSON in ```json ... ```.
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
    text = text.strip()
    data: Any = json.loads(text)
    return schema.model_validate(data)


_client: LLMClient | None = None


def get_llm() -> LLMClient:
    global _client
    if _client is None:
        _client = LLMClient()
    return _client
