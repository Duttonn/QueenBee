import json
import subprocess
import sys

def get_git_diff(project_path, file_path=None):
    try:
        # Get overall stats first: git diff --numstat
        stat_cmd = ["git", "diff", "--numstat"]
        if file_path:
            stat_cmd.append(file_path)
        
        stat_result = subprocess.run(stat_cmd, cwd=project_path, capture_output=True, text=True, check=True)
        
        file_stats = {}
        total_added = 0
        total_removed = 0
        
        for line in stat_result.stdout.splitlines():
            added, removed, path = line.split('\t')
            if added == '-' or removed == '-': # Binary files
                added = 0
                removed = 0
            else:
                added = int(added)
                removed = int(removed)
            
            file_stats[path] = {"added": added, "removed": removed}
            total_added += added
            total_removed += removed

        # Get actual hunks: git diff -U3
        diff_cmd = ["git", "diff", "--unified=3"]
        if file_path:
            diff_cmd.append(file_path)
            
        result = subprocess.run(diff_cmd, cwd=project_path, capture_output=True, text=True, check=True)
        diff_output = result.stdout

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
                
                parts = line.split(' ')
                if len(parts) > 4:
                    current_file = parts[3][2:] # Remove 'b/'
                current_hunks = []
                current_hunk = None
                continue
            
            if line.startswith('@@'):
                if current_hunk:
                    current_hunks.append(current_hunk)
                current_hunk = {"header": line, "lines": []}
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
