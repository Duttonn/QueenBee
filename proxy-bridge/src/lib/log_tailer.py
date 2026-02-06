#!/usr/bin/env python3
import time
import sys
import os

def tail_logs(log_path):
    """Monitors a log file and could eventually emit to WebSocket."""
    if not os.path.exists(log_path):
        print(f"Error: Log file {log_path} not found.")
        return

    with open(log_path, 'r') as f:
        f.seek(0, os.SEEK_END)
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.1)
                continue
            # Format for UI: [TIMESTAMP] [JOB_ID] LOG_MESSAGE
            print(f"[{time.strftime('%H:%M:%S')}] {line.strip()}", flush=True)

if __name__ == "__main__":
    # Example: tailing the Blackjack data generation logs
    target_log = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.getcwd(), "logs/generation.log")
    tail_logs(target_log)
