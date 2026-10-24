"""Stub google.genai: STUB_MODE=ok answers with a box, STUB_MODE=429 always rate-limits."""
import json
import os
from . import errors, types  # noqa: F401

CALLS = os.environ.get("STUB_CALLS")


class _Resp:
    def __init__(self, text): self.text = text


class _Models:
    def generate_content(self, model, contents, config):
        if CALLS:
            with open(CALLS, "a") as f:
                f.write("x\n")
        if os.environ.get("STUB_MODE") == "429":
            raise errors.APIError(429)
        return _Resp(json.dumps({"rip": True, "boxes": [[250, 100, 750, 500]]}))


class Client:
    def __init__(self, api_key): self.models = _Models()
