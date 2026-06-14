const MAX_LINES = 1000;

interface GitHubFile {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
}

export async function readGitHubFiles(files: GitHubFile[]): Promise<string> {
  const results: string[] = [];

  for (const file of files) {
    const owner = file.owner;
    const repo = file.repo;
    const path = file.path;
    const ref = file.ref || "main";

    const rawRef =
      ref.length === 40 ? ref : `refs/heads/${ref}`;

    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${rawRef}/${path}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        results.push(
          `## Error reading ${owner}/${repo}/${path}\n\nHTTP ${response.status}: ${response.statusText}`
        );
        continue;
      }

      const content = await response.text();
      const lines = content.split("\n");
      const totalLines = lines.length;

      let finalContent = content;

      if (totalLines > MAX_LINES) {
        finalContent =
          lines.slice(0, MAX_LINES).join("\n") +
          `\n\n[File truncated: showing first ${MAX_LINES} of ${totalLines} lines]`;
      }

      results.push(
        `## File: ${owner}/${repo}/${path}\n\n` +
        "```text\n" +
        finalContent +
        "\n```"
      );
    } catch (error) {
      results.push(
        `## Error reading ${owner}/${repo}/${path}\n\n${String(error)}`
      );
    }
  }

  return results.join("\n\n---\n\n");
}