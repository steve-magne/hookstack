#!/usr/bin/env python3
# @hookstack message-display-redact-pii
"""Redacts hard PII (card numbers, IBANs, SSNs) in displayed content (MessageDisplay).
Emails are intentionally excluded — too common in dev contexts."""
import json
import re
import sys

CC_RE = re.compile(
    r"\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{3,4}\b"
)
IBAN_RE = re.compile(r"\b[A-Z]{2}[0-9]{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b")
SSN_RE = re.compile(r"\b(?:\d{3}-\d{2}-\d{4}|\d{13}\s?\d{2})\b")


def run(input_data=None):
    delta = (input_data or {}).get("delta") or ""

    redacted = CC_RE.sub("[REDACTED-CARD]", delta)
    redacted = IBAN_RE.sub("[REDACTED-IBAN]", redacted)
    redacted = SSN_RE.sub("[REDACTED-SSN]", redacted)

    if redacted == delta:
        return None
    return {
        "hookSpecificOutput": {
            "hookEventName": "MessageDisplay",
            "displayContent": redacted,
        },
    }


if __name__ == "__main__":
    data = json.load(sys.stdin)
    result = run(data)
    if result:
        sys.stdout.write(json.dumps(result))
