import { readGitHubFiles } from './tools';

async function test() {
  console.log('Testing read_github_files...\n');

  const content = await readGitHubFiles([
    {
      owner: 'microsoft',
      repo: 'vscode',
      path: 'package.json',
      ref: 'main',
    },

    // This file does not exist, so it should be skipped without throwing an error
    // {
    //     owner: 'microsoft',
    //     repo: 'vscode',
    //     path: 'fake-file.txt',
    //     ref: 'main',
    // }

    // This file does not exist, so it should be skipped without throwing an error
    // {
    //     owner: 'microsoft',
    //     repo: 'vscode',
    //     path: 'fake-file.txt',
    //     ref: 'main',
    // }

  ]);

  console.log(content);
}

test();