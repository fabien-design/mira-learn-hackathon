"""Shared JSON parsing utilities for LLM response handling."""
from __future__ import annotations

import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


def _sanitize_json_string(s: str) -> str:
    """Strip raw control characters that small LLMs embed in string values.

    WHY: gemma3:1b and similar models insert literal 0x0A bytes inside JSON
    string values instead of escaping them as \\n, which json.loads rejects.
    Replacing all bare newlines with spaces is safe: json.loads accepts spaces
    both as structural whitespace and inside string values.
    """
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', s)
    return s.replace('\r\n', ' ').replace('\r', ' ').replace('\n', ' ')


def parse_llm_json(content: str) -> dict[str, Any]:
    """Parse a JSON object from an LLM response with multi-stage recovery.

    Handles:
    - Markdown code fences (```json ... ```)
    - Raw control characters in string values
    - Truncated JSON (recovers up to the last complete object)
    - JSON embedded in surrounding prose

    WHY: small/local LLMs (gemma3:1b, llama3.2) frequently produce malformed
    output. This parser tolerates common failure modes so extraction does not
    silently return {} for every call.
    """
    s = content.strip()

    # Strip markdown fence
    if s.startswith("```"):
        s = s.strip("`")
        if s.startswith("json"):
            s = s[4:].lstrip()

    s = _sanitize_json_string(s)

    # Direct parse
    try:
        return json.loads(s)
    except json.JSONDecodeError as first_err:
        # Recovery: truncate at error position, close the last valid array item
        # WHY: gemma3:1b sometimes embeds skills as a malformed last experience
        # entry — invalid JSON at parse time. Truncate + close recovers the rest.
        truncated = s[:first_err.pos]
        last_item_end = truncated.rfind("},")
        if last_item_end < 0:
            last_item_end = truncated.rfind("}")
        if last_item_end > 0:
            candidate = truncated[:last_item_end + 1] + "]}"
            try:
                result = json.loads(candidate)
                logger.warning("parse_llm_json: recovered partial JSON (truncated at pos %d)", first_err.pos)
                return result
            except json.JSONDecodeError:
                pass

    # Extract first {...} block from surrounding prose
    start = s.find("{")
    end = s.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(s[start:end + 1])
        except json.JSONDecodeError:
            pass

    return {}
