import argparse
import os
import sys
import re
from datetime import datetime
from dotenv import load_dotenv, find_dotenv
from openai import OpenAI

# Locate and load .env
load_dotenv(find_dotenv())

# Identity Header
print("flashcards: Developed by Shu-Ting Hsu - 133505222")
print(f"Run Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("--------------------------------------------------------------")

# Read API Key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Validate API Key
if not OPENROUTER_API_KEY:
    print("❌ Error: OPENROUTER_API_KEY not found")
    sys.exit(1)

print("✅ API Key loaded successfully")


def get_file_contents(path, description):
    """Read a file and return its contents, or exit on error."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"❌ Error: {description} not found: {path}")
        sys.exit(1)
    except Exception as err:
        print(f"❌ Error reading {description}: {path}")
        print(f"   {err}")
        sys.exit(1)

# Command Line Arguments
def parse_arguments():
    parser = argparse.ArgumentParser(
        description='Generate ACE flashcards from course notes'
    )
    parser.add_argument(
        'notes_path',
        help='Path to the notes file (Markdown, HTML, or text)'
    )
    parser.add_argument(
        '--cards',
        type=int,
        default=3,
        help='Number of flashcards to generate (1-5, default: 3)'
    )

    args = parser.parse_args()

    # Validate cards range
    if args.cards < 1 or args.cards > 5:
        parser.error('--cards must be between 1 and 5')

    return args

# Usage
args = parse_arguments()

notes_path = args.notes_path
cards = args.cards
system_prompt = get_file_contents('SYSTEM_PROMPT.md', 'System prompt file')
notes_content = get_file_contents(notes_path, 'Notes file')

# Build user prompt
user_prompt = f"""
Generate {args.cards} ACE flashcards from the provided course notes.

Use ONLY information from the notes.

Do NOT hallucinate or invent concepts.

All evidence quotes must appear exactly in the notes.

Expand all acronyms in the CHALLENGE section.

<notes>
{notes_content}
</notes>

"""

# Create OpenRouter client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY
)

try:
    response = client.chat.completions.create(
        # low cost models for testing
        # openai/gpt-4.1-nano
        # meta-llama/llama-3.3-70b-instruct:free
        model="openai/gpt-4.1-nano",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
    )

    output = response.choices[0].message.content

    # for testing
    # print("\n===== RAW MODEL OUTPUT =====")
    # print(output)

except Exception as error:
    print(f"❌ Error calling OpenRouter API: {error}")
    sys.exit(1)

# Extract all cards using regex
cards = re.findall(
    r'(=== CARD \d+ ===.*?)(?=\n=== CARD|\Z)',
    output,
    re.DOTALL
)

if not cards:
    print("❌ Unable to generate ACE flashcards.")
    print("\n Possible reasons:")
    print("- The content is unclear or insufficient")
    print("- The notes do not contain enough concepts")

    sys.exit(1)

print(f"\n✅ Generated {len(cards)} flashcard(s):\n")
for card in cards:
    print(card)
    print()  # blank line between cards