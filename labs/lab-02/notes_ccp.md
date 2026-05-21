# Week 3: Git, GitHub, and Continuous Integration

## Lecture

<https://www.youtube.com/watch?v=nBxFcVPGDYM>

## Overview

This week we'll explore one of the most fundamental aspects of cloud development: Git and GitHub, with a specific focus on continuous integration (CI). We'll also introduce our first type of testing: unit testing.

## Introduction to Git

As one of my colleagues from Netflix said: "If you're going to teach anything about cloud, you've got to teach them everything in Git, period, always." This perfectly captures the importance of Git in modern cloud development.

### Why Git Matters

Git has become the de facto standard for version control in software development. While it may not be the easiest tool to learn initially, it's essential for any software developer today. Git represents a paradigm shift from traditional revision control systems, operating as a distributed file system rather than a centralized one.

### Essential Git Commands

Here are the core Git commands you'll use daily:

#### File Management Commands

- `git add package.json package-lock.json` - Add specific files to staging
- `git add test/` - Add entire directories
- ~~`git add .`~~ - **Avoid this!** Adding everything can include unwanted files
- `git mv authorization.js cognito.js` - Move/rename files
- `git rm old-file.js` - Remove files from Git tracking

#### Information and Workflow Commands

- `git status` - Check repository state (use this constantly!)
- `git commit -m "Add user authentication tests"` - Create commits with meaningful messages
- `git log` - View commit history
- `git push origin main` - Push commits to remote repository

### The Git Workflow

Git operates on three main areas:

1. **Working Directory**: Your current file system where you make changes
2. **Staging Area**: Where you prepare changes for the next commit
3. **Repository**: The Git database containing all snapshots

Think of the staging area like directing a play - you carefully position actors (files) on stage before the performance (commit) begins.

### Best Practices

- **Be specific with `git add`**: Always explicitly add files rather than using wildcards
- **Avoid generated files**: Never commit `node_modules`, binaries, build artifacts, or other generated content
- **Use meaningful commit messages**: Your future self will thank you
- **Commit frequently**: Make small, logical commits rather than large, complex ones

## Understanding Git Objects and Naming

Git uses SHA checksums to identify every object in its database. These long strings (like `1c12f13a8b9c...`) uniquely identify files and commits. For convenience, we can use:

- **Short SHAs**: The first 7 characters (e.g., `1c12f13`)
- **Branches**: Human-readable names that move forward with new commits (e.g., `main`)
- **Tags**: Fixed names for specific points in history (e.g., `v2.3.1`)

## GitHub and Continuous Integration

### What is Continuous Integration?

Continuous Integration (CI) is a development philosophy where we build and test code every time changes are made. Instead of waiting until the end of a project to integrate everyone's work, we continuously merge and validate changes.

### Benefits of CI

- **Early bug detection**: Find problems before they become expensive to fix
- **Automation over manual processes**: Computers don't get tired or skip steps
- **Multi-platform testing**: Run code on different operating systems simultaneously
- **Team coordination**: Prevent developers from working in isolation

### Cultural Shifts with CI

- Prefer automation over manual testing
- Fix bugs early rather than late
- Merge frequently rather than waiting for "perfect" code
- **Never break CI**: If you break the build, fix it immediately

## GitHub Actions

GitHub Actions provides cloud-based CI/CD using Microsoft Azure infrastructure. Each action runs on a VM with:

- 4 CPU Cores
- 16GB RAM
- 14GB SSD storage
- Choice of Windows, Linux, or macOS

### Workflow Structure

A GitHub Actions workflow consists of:

```
Workflow (triggered by events)
├── Job 1 (runs on specific OS)
│   ├── Step 1 (checkout code)
│   ├── Step 2 (setup environment)
│   └── Step 3 (run tests)
└── Job 2 (runs in parallel)
    ├── Step 1 (checkout code)
    └── Step 2 (run linting)
```

### Basic Workflow Example

```yaml
on:
  push:
    branches: main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: scripts/test.sh
```

### More Complex Example with Node.js

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v5

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install and lint
        run: |
          npm install
          npm run lint
```

### Key Concepts

- **Jobs run in parallel**: Multiple jobs can execute simultaneously
- **Steps run in sequence**: Within a job, steps execute one after another
- **Failure stops execution**: If any step fails, the entire job fails
- **Pre-built actions**: Use existing actions from the marketplace to avoid reinventing the wheel

## Testing in the Cloud

Testing is a crucial component of CI/CD pipelines. We'll start with unit testing and expand to other testing types throughout the course. The goal is to automate quality assurance and catch issues before they reach production.

## Next Steps

In the following materials, we'll dive deeper into:

- Writing effective unit tests
- Setting up GitHub Actions workflows
- Implementing linting and code quality checks
- Integrating testing into your development workflow

Remember: CI/CD is about building confidence in your code through automation. Even senior engineers break builds regularly - the key is catching and fixing issues quickly through automated testing and continuous integration.
