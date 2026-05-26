import dotenv from 'dotenv';

// Locate and load .env
dotenv.config();

const MAX_DIFF_LENGTH = 95000;

interface PullRequestInfo {
  owner: string;
  repo: string;
  prNumber: number;
  url: string;
}

function parseGitHubPrUrl(input: string): PullRequestInfo {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    console.error('❌ Error: Please provide a valid URL.');
    process.exit(1);
  }

  if (url.origin !== 'https://github.com') {
    console.error('❌ Error: URL must be from https://github.com');
    process.exit(1);
  }

  const parts = url.pathname.split('/').filter(Boolean);

  // Expected: /owner/repo/pull/number
  if (parts.length !== 4 || parts[2] !== 'pull') {
    console.error('❌ Error: Please provide a valid GitHub Pull Request URL.');
    process.exit(1);
  }

  const owner = parts[0];
  const repo = parts[1];
  const prNumber = Number(parts[3]);

  if (!owner || !repo || Number.isNaN(prNumber)) {
    console.error('❌ Error: Could not parse owner, repo, or PR number.');
    process.exit(1);
  }

  return {
    owner,
    repo,
    prNumber,
    url: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
  };
}

async function fetchDiff(prUrl: string): Promise<string> {
  const diffUrl = `${prUrl}.diff`;

  console.log(`Fetching diff from: ${diffUrl}`);

  const response = await fetch(diffUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch diff: ${response.status}`);
  }

  let diffText = await response.text();

  if (diffText.length > MAX_DIFF_LENGTH) {
    console.warn('⚠️ Diff is too long. Truncating to 95,000 characters.');
    diffText = diffText.slice(0, MAX_DIFF_LENGTH) + '\n\n...[Diff Truncated]...';
  }

  return diffText;
}

async function main() {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    console.error('❌ Error: OPENROUTER_API_KEY not found');
    process.exit(1);
  }

  const inputUrl = process.argv[2];

  if (!inputUrl) {
    console.error('❌ Error: Please provide a GitHub PR URL.');
    console.error('Example: npm start https://github.com/microsoft/vscode/pull/289801');
    process.exit(1);
  }

  const prInfo = parseGitHubPrUrl(inputUrl);

  console.log('✅ Parsed PR URL successfully');
  console.log(`Owner: ${prInfo.owner}`);
  console.log(`Repo: ${prInfo.repo}`);
  console.log(`PR Number: ${prInfo.prNumber}`);

  const diff = await fetchDiff(prInfo.url);

  console.log('✅ Diff fetched successfully');
  console.log(`Diff length: ${diff.length} characters`);

  // For demonstration, we print the first 500 characters of the diff
  console.log('\n--- Diff Preview ---');
  console.log(diff.slice(0, 500));
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});