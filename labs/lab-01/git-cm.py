import os
import sys
from datetime import datetime
from dotenv import load_dotenv, find_dotenv

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