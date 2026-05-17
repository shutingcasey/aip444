import os
import sys
import subprocess
from datetime import datetime
from dotenv import load_dotenv, find_dotenv
from openai import OpenAI


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

# Check creative mode
is_creative = "--creative" in sys.argv

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

def generate_commit_message(diff, is_creative):
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY
    )

    if is_creative:
        temperature = 1.2
        system_prompt = """
You are an LLM running in a CLI tool that writes fun commit messages.
You will be given a git diff.
Output ONLY one creative commit message.

Use Gitmoji and 17th Century Pirate slang.
Keep it short and suitable for git commit -m.
Do not use Markdown.
Do not explain your answer.
Do not include quotes.

Example:
🏴‍☠️ feat: addeth logging to the ship's code
"""
    else:
        temperature = 0.1
        system_prompt = """
You are an LLM running in a CLI tool that writes semantic commit messages.
You will be given a git diff.
Output ONLY one commit message using the Conventional Commits format.

Examples:
feat: add user login form
fix(auth): handle missing token
docs: update README instructions

Do not use Markdown.
Do not explain your answer.
Do not include quotes.
"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-4.1-nano",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": diff}
            ],
            temperature=temperature
        )

        return response.choices[0].message.content.strip()

    except Exception as error:
        print(f"❌ Error calling OpenRouter API: {error}")
        sys.exit(1)


diff = get_git_diff()

print(f"✅ Diff found: {len(diff)} characters")

commit_message = generate_commit_message(diff, is_creative)

print("\nGenerated commit message:")
print(commit_message)

# test creative mode