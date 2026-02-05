import json
import subprocess
import sys

def get_git_diff(project_path, file_path=None):
    try:
        cmd = ["git", "diff", "--unified=3"]
        if file_path:
            cmd.append(file_path)
        
        result = subprocess.run(cmd, cwd=project_path, capture_output=True, text=True, check=True)
        diff_output = result.stdout

        lines = diff_output.splitlines()
        parsed_diff = []
        current_file = None

        for line in lines:
            if line.startswith('diff --git'):
                parts = line.split(' ')
                # Heuristic to get the file path, assumes format like 'diff --git a/path/to/file b/path/to/file'
                if len(parts) > 4:
                    current_file = parts[3][2:] # Remove 'b/' prefix
                continue
            if line.startswith('--- a/'):
                current_file = line[6:]
                continue
            if line.startswith('+++ b/'):
                current_file = line[6:]
                continue
            if line.startswith('@@'):
                # @@ -start,count +start,count @@
                parts = line.split(' ')
                if len(parts) >= 3:
                    range_info = parts[2].split(',') # '+start,count'
                    if len(range_info) > 0:
                        try:
                            start_line = int(range_info[0].replace('+', ''))
                        except ValueError:
                            start_line = 0 # Default if parsing fails
                        parsed_diff.append({"type": "header", "content": line, "line": start_line})
                continue

            if line.startswith('+'):
                parsed_diff.append({"type": "add", "content": line[1:]})
            elif line.startswith('-'):
                parsed_diff.append({"type": "del", "content": line[1:]})
            else:
                parsed_diff.append({"type": "neutral", "content": line[1:]})
        
        return {
            "status": "success",
            "file": file_path if file_path else current_file,
            "diff": parsed_diff
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
