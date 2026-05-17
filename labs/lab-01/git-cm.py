import os
import sys
from datetime import datetime
from dotenv import load_dotenv, find_dotenv
import subprocess

# Locate and load .env
load_dotenv(find_dotenv())

# Identity Header
print("git-cm: Developed by Shu-Ting Hsu - 133505222")
print(f"Run Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("--------------------------------------------------------------")

# Read API Key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Validate API Key
if not OPENROUTER_API_KEY:
    print("❌ Error: OPENROUTER_API_KEY not found")
    sys.exit(1)

print("✅ API Key loaded successfully")

# Function to get staged diff
def get_git_diff():
    try:
        # Run git diff --staged
        result = subprocess.run(["git", "diff", "--staged"], capture_output=True, text=True, encoding="utf-8", errors="replace",check=True)
        diff = result.stdout.strip()

        # No staged changes
        if not diff:
            print("❌ No staged changes found.")
            sys.exit(1)
        return diff

    except subprocess.CalledProcessError:
        print("❌ Not a git repo.")
        sys.exit(1)


# Call function
diff = get_git_diff()

print(f"✅ Diff found: {len(diff)} characters")