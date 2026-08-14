#!/usr/bin/env python3
# @hookstack stop-failure-rate-limit-alert
"""StopFailure (rate_limit): fires a desktop notification via OSC-9."""
import json
import sys


def run(input_data=None):
    seq = "\x1b]9;Claude Code — rate limit hit, paused\x07"
    return {"terminalSequence": seq}


if __name__ == "__main__":
    sys.stdout.write(json.dumps(run()))
