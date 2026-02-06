#!/usr/bin/env python3
import json
import os
import time

CODEX_HOME = os.environ.get('CODEX_HOME', os.path.expanduser('~/.codex'))
RELAY_CACHE = os.path.join(CODEX_HOME, "sessions/relay_cache.json")

def create_snapshot(project_id, agent_id, summary, files_touched):
    """Captures the essence of a session before a model swap."""
    snapshot = {
        "timestamp": time.time(),
        "project_id": project_id,
        "last_agent": agent_id,
        "distilled_context": summary,
        "active_files": files_touched,
        "status": "ready_for_relay"
    }
    
    os.makedirs(os.path.dirname(RELAY_CACHE), exist_ok=True)
    with open(RELAY_CACHE, 'w') as f:
        json.dump(snapshot, f, indent=2)
    print(f"[Relay] Snapshot captured for {project_id}")

def get_relay_prompt(project_id):
    """Generates the system prompt for the incoming model."""
    if not os.path.exists(RELAY_CACHE):
        return "No relay data found."
        
    with open(RELAY_CACHE, 'r') as f:
        data = json.load(f)
        
    if data['project_id'] != project_id:
        return "Project mismatch."

    return f"""
# RELAY CONTEXT (from {data['last_agent']})
## Distilled Summary:
{data['distilled_context']}

## Modified Files:
{', '.join(data['active_files'])}

Resume the task immediately based on this state.
"""

if __name__ == "__main__":
    # Example usage
    create_snapshot(
        "codex-clone", 
        "claude-4.5-opus", 
        "Implemented Relay Buffer architecture and Python scripts. Ready to animate UI.",
        ["architecture/RELAY_BUFFER.md", "proxy-bridge/src/lib/relay_manager.py"]
    )
