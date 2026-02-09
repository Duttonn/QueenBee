import json
import subprocess
import sys
import os
import re

def get_git_diff(project_path, file_path=None):
    try:
        # Check if HEAD exists
        has_head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=project_path, capture_output=True).returncode == 0
        
        diff_base = ["HEAD"] if has_head else []

        # Get overall stats first: git diff HEAD --numstat
        stat_cmd = ["git", "diff", "--numstat"] + diff_base
        if file_path:
            stat_cmd.append(file_path)
        
        stat_result = subprocess.run(stat_cmd, cwd=project_path, capture_output=True, text=True, check=True)
        
        file_stats = {}
        total_added = 0
        total_removed = 0
        
        for line in stat_result.stdout.splitlines():
            parts = line.split('\t')
            if len(parts) < 3: continue
            added, removed, path = parts
            if added == '-' or removed == '-': # Binary files
                added = 0
                removed = 0
            else:
                added = int(added)
                removed = int(removed)
            
            file_stats[path] = {"added": added, "removed": removed}
            total_added += added
            total_removed += removed

        # Get actual hunks: git diff HEAD --unified=3
        diff_cmd = ["git", "diff", "--unified=3"] + diff_base
        if file_path:
            diff_cmd.append(file_path)
            
        result = subprocess.run(diff_cmd, cwd=project_path, capture_output=True, text=True, check=True)
        diff_output = result.stdout

        # --- Handle Untracked Files ---
        if not file_path:
            untracked_cmd = ["git", "ls-files", "--others", "--exclude-standard"]
            untracked_result = subprocess.run(untracked_cmd, cwd=project_path, capture_output=True, text=True, check=True)
            for untracked_file in untracked_result.stdout.splitlines():
                if untracked_file not in file_stats:
                    try:
                        with open(os.path.join(project_path, untracked_file), 'r', errors='ignore') as f:
                            content = f.read()
                            lines_count = len(content.splitlines())
                            file_stats[untracked_file] = {"added": lines_count, "removed": 0}
                            total_added += lines_count
                            
                            # Create a fake diff hunk for untracked file
                            fake_diff = f"diff --git a/{untracked_file} b/{untracked_file}\n"
                            fake_diff += "new file mode 100644\n"
                            fake_diff += "--- /dev/null\n"
                            fake_diff += f"+++ b/{untracked_file}\n"
                            fake_diff += f"@@ -0,0 +1,{lines_count} @@\n"
                            for c_line in content.splitlines():
                                fake_diff += f"+{c_line}\n"
                            diff_output += fake_diff
                    except Exception:
                        continue

        lines = diff_output.splitlines()
        files = []
        current_file = None
        current_hunks = []
        current_hunk = None

        for line in lines:
            if line.startswith('diff --git'):
                if current_file:
                    if current_hunk:
                        current_hunks.append(current_hunk)
                    files.append({
                        "path": current_file,
                        "stats": file_stats.get(current_file, {"added": 0, "removed": 0}),
                        "hunks": current_hunks
                    })
                
                # Robust extraction of the "b/" filename
                match = re.search(r' b/(.*)$', line)
                if match:
                    current_file = match.group(1).strip().strip('"')
                
                current_hunks = []
                current_hunk = None
                continue
            
            if line.startswith('@@'):
                if current_hunk:
                    current_hunks.append(current_hunk)
                
                # Parse @@ -oldStart,oldLen +newStart,newLen @@
                try:
                    parts = line.split(' ')
                    old_parts = parts[1][1:].split(',')
                    new_parts = parts[2][1:].split(',')
                    old_start = int(old_parts[0])
                    new_start = int(new_parts[0])
                except (IndexError, ValueError):
                    old_start = 0
                    new_start = 0

                current_hunk = {
                    "header": line, 
                    "lines": [],
                    "oldStart": old_start,
                    "newStart": new_start
                }
                continue
            
            if current_hunk is not None:
                current_hunk["lines"].append(line)

        # Append last file
        if current_file:
            if current_hunk:
                current_hunks.append(current_hunk)
            files.append({
                "path": current_file,
                "stats": file_stats.get(current_file, {"added": 0, "removed": 0}),
                "hunks": current_hunks
            })
        
        return {
            "status": "success",
            "added": total_added,
            "removed": total_removed,
            "files": files
        }
    except subprocess.CalledProcessError as e:
        return {
            "status": "error",
            "message": e.stderr.strip()
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Usage: python git_diff_extractor.py <project_path> [file_path]"}))
        sys.exit(1)
    
    project_path = sys.argv[1]
    file_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    diff_data = get_git_diff(project_path, file_path)
    print(json.dumps(diff_data))