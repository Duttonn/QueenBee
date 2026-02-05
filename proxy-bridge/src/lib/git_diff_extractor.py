#!/usr/bin/env python3
import subprocess
import json
import sys
import os

def get_git_diff(project_path, file_path=None):
    """
    Extracts git diff in a structured JSON format for the UI.
    If file_path is provided, gets diff for that file. Otherwise, gets all unstaged changes.
    """
    try:
        cmd = ["git", "diff", "--unified=3"]
        if file_path:
            cmd.append(file_path)
        
        raw_diff = subprocess.check_output(cmd, cwd=project_path).decode('utf-8')
        
        if not raw_diff:
            return {"status": "no_changes", "diff": []}

        structured_diff = []
        current_file = file_path
        lines = raw_diff.split('\n')
        
        line_no_old = 0
        line_no_new = 0

        for line in lines:
            if line.startswith('@@'):
                # Extract starting line numbers from @@ -line,count +line,count @@
                parts = line.split(' ')
                line_no_old = int(parts[1].split(',')[0].replace('-', ''))
                line_no_new = int(parts[2].split(',')[0].replace('+', ''))
                continue
            
            if line.startswith('---') or line.startswith('+++') or line.startswith('diff'):
                continue

            type = 'neutral'
            if line.startswith('+'):
                type = 'add'
                line_no = line_no_new
                line_no_new += 1
            elif line.startswith('-'):
                type = 'del'
                line_no = line_no_old
                line_no_old += 1
            else:
                line_no = line_no_new
                line_no_old += 1
                line_no_new += 1

            structured_diff.append({
                "line": line_no,
                "type": type,
                "content": line[1:] if type != 'neutral' else line
            })

        return {
            "status": "success",
            "file": current_file,
            "diff": structured_diff
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "/home/fish/clawd"
    target_file = sys.argv[2] if len(sys.argv) > 2 else None
    result = get_git_diff(path, target_file)
    print(json.dumps(result, indent=2))
