import dotenv from 'dotenv';
import fs from 'fs';
import OpenAI from 'openai';

// Locate and load .env
dotenv.config();

const MAX_DIFF_LENGTH = 95000;
interface PullRequestInfo {
  owner: string;
  repo: string;
  prNumber: number;
  url: string;
}

interface Comment {
  username: string;
  body: string;
  date: string;
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

async function fetchComments(owner: string, repo: string, issueNum: number): Promise<Comment[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNum}/comments`;

  console.log(`Fetching comments from: ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AIP444-Lab-03',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.status}`);
  }

  const data = await response.json();

  return data.map((item: any) => ({
    username: item.user.login,
    body: item.body,
    date: item.updated_at,
  }));
}

function getFileContents(path: string, description: string): string {
  try {
    return fs.readFileSync(path, 'utf-8');
  } catch (error) {
    console.error(`❌ Error: ${description} not found: ${path}`);
    process.exit(1);
  }
}

function buildUserPrompt(diff: string, comments: Comment[]): string {
  const commentThread = comments
    .map(
      (comment) => `
      <comment username="${comment.username}" date="${comment.date}">
      ${comment.body}
      </comment>`
    )
    .join('\n');

  return `
Please analyze the following GitHub Pull Request.

<diff>
\`\`\`diff
${diff}
\`\`\`
</diff>

<thread>
${commentThread || 'No issue comments were found for this PR.'}
</thread>
`;
}

async function callOpenRouter(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
  });

  const response = await client.chat.completions.create({
    model: 'openai/gpt-4.1-nano',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response content returned from OpenRouter');
  }

  return content;
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
  const diff = await fetchDiff(prInfo.url);
  const comments = await fetchComments(prInfo.owner, prInfo.repo, prInfo.prNumber);
  const systemPrompt = getFileContents('SYSTEM_PROMPT.md', 'System prompt file');
  const userPrompt = buildUserPrompt(diff, comments);
  const output = await callOpenRouter(
    OPENROUTER_API_KEY,
    systemPrompt,
    userPrompt
  );
  console.log('\n===== PR ADVICE REPORT =====');
  console.log("PR ADVICE REPORT: Developed by Shu-Ting Hsu - 133505222")
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const runDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  console.log(`Run Date: ${runDate}`);
  console.log("============================")
  console.log(output);
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});