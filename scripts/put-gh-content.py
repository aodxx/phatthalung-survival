import base64
import json
import subprocess
import sys
import tempfile
from pathlib import Path

repo, branch, remote_path, source_path, message = sys.argv[1:]
payload = {
    "message": message,
    "content": base64.b64encode(Path(source_path).read_bytes()).decode("ascii"),
    "branch": branch,
}
ref = branch.replace("/", "%2F")
try:
    sha = subprocess.check_output(
        ["gh", "api", f"repos/{repo}/contents/{remote_path}?ref={ref}", "--jq", ".sha"],
        text=True,
        stderr=subprocess.DEVNULL,
    ).strip()
    if sha:
        payload["sha"] = sha
except subprocess.CalledProcessError:
    pass
with tempfile.NamedTemporaryFile("w", delete=False, suffix=".json") as handle:
    json.dump(payload, handle)
    payload_path = handle.name
subprocess.run(
    [
        "gh", "api", "--method", "PUT",
        f"repos/{repo}/contents/{remote_path}",
        "--input", payload_path,
        "--jq", ".commit.sha",
    ],
    check=True,
)
